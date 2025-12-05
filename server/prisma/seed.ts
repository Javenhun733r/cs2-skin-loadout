/* eslint-disable */
import { Prisma, PrismaClient } from '@prisma/client';
import axios from 'axios';
import { converter, formatHex } from 'culori';
import * as KMeans from 'ml-kmeans';
import pLimit from 'p-limit';
import sharp from 'sharp';

import {
  BIN_NAMES,
  classifyColor,
  createVectorString,
  type ColorBin,
} from '../src/utils/color.utils';

type Histogram = Record<ColorBin, number>;
const SKINS_JSON_URL =
  'https://raw.githubusercontent.com/ByMykel/CSGO-API/main/public/api/en/skins.json';
const AGENTS_JSON_URL =
  'https://raw.githubusercontent.com/ByMykel/CSGO-API/main/public/api/en/agents.json';

const prisma = new PrismaClient();
const DB_BATCH_SIZE = 500;
const CONCURRENT_DOWNLOADS = 10;

const toOklab = converter('oklab');

const CONFIG = {
  IMAGE_RESIZE: { width: 128, height: 128 },
  ALPHA_THRESHOLD: 230,
  REQUEST_TIMEOUT: 15000,
  RETRY_ATTEMPTS: 3,
  RETRY_DELAY: 1000,
  BRIGHTNESS_BOOST: 1.0,
  SATURATION_BOOST: 1.0,
} as const;

interface RawSkinData {
  id: string;
  name: string;
  weapon: { id: string; weapon_id: number; name: string } | null;
  rarity: { id: string; name: string; color: string } | null;
  image: string;
}

interface RawAgentData {
  id: string;
  name: string;
  description: string;
  rarity: { id: string; name: string; color: string };
  image: string;
  team: { id: string; name: string };
}

interface SkinDataForRawInsert {
  id: string;
  name: string;
  image: string;
  weapon: string;
  rarity: string;
  type: string;
  dominantHex: string;
  histogramVector: string;
}

function getErrorMessage(err: unknown): string {
  if (err instanceof Error) return err.message;
  if (typeof err === 'string') return err;
  return JSON.stringify(err);
}

function logError(err: unknown, context?: string): void {
  const message = getErrorMessage(err);
  if (context) console.error(`${context}: ${message}`);
  else console.error(message);
}

async function wait(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function fetchWithRetry(url: string): Promise<Buffer> {
  let lastErr: unknown = null;

  for (let attempt = 1; attempt <= CONFIG.RETRY_ATTEMPTS; attempt++) {
    try {
      const response = await axios.get(url, {
        responseType: 'arraybuffer',
        timeout: CONFIG.REQUEST_TIMEOUT,
        validateStatus: (code) => code >= 200 && code < 300,
      });

      return Buffer.from(response.data);
    } catch (err) {
      lastErr = err;
      console.warn(
        `Fetch failed (attempt ${attempt}/${CONFIG.RETRY_ATTEMPTS}) for ${url}. Retrying in ${CONFIG.RETRY_DELAY}ms...`,
      );
      await wait(CONFIG.RETRY_DELAY);
    }
  }

  console.error(`fetchWithRetry FAILED for ${url}`);

  if (lastErr instanceof Error) {
    throw lastErr;
  }
  throw new Error(
    typeof lastErr === 'string' ? lastErr : 'Unknown fetch error',
  );
}

async function extractColorData(
  imageUrl: string,
): Promise<{ histogram: Histogram; dominantHex: string }> {
  const histogram = {} as Histogram;
  BIN_NAMES.forEach((bin) => (histogram[bin] = 0));

  let dominantHex = '#808080';

  try {
    const buffer = await fetchWithRetry(imageUrl);

    const { data } = await sharp(buffer)
      .ensureAlpha()
      .resize(CONFIG.IMAGE_RESIZE.width, CONFIG.IMAGE_RESIZE.height, {
        fit: 'inside',
        kernel: 'nearest',
      })
      .modulate({
        saturation: 1.1,
        brightness: 1.0,
      })
      .raw()
      .toBuffer({ resolveWithObject: true });

    const pixels: number[][] = [];
    let actualPixels = 0;
    let totalWeight = 0;

    const ACHROMATIC_BINS = ['Black', 'White', 'Gray'];

    for (let i = 0; i < data.length; i += 4) {
      const r = data[i];
      const g = data[i + 1];
      const b = data[i + 2];
      const a = data[i + 3];

      if (a < CONFIG.ALPHA_THRESHOLD) continue;

      const distribution = classifyColor(r / 255, g / 255, b / 255, a);

      for (const [binName, ratio] of Object.entries(distribution)) {
        const bin = binName as ColorBin;

        const isChromatic = !ACHROMATIC_BINS.includes(bin);
        const baseWeight = isChromatic ? 6 : 1;

        const weight = baseWeight * ratio;

        histogram[bin] = (histogram[bin] || 0) + weight;
        totalWeight += weight;
      }

      actualPixels++;

      if (actualPixels % 5 === 0) {
        const oklab = toOklab({
          mode: 'rgb',
          r: r / 255,
          g: g / 255,
          b: b / 255,
        });

        if (oklab) {
          pixels.push([oklab.l, oklab.a || 0, oklab.b || 0]);
        }
      }
    }

    if (totalWeight > 0) {
      for (const key of BIN_NAMES) {
        histogram[key] = (histogram[key] || 0) / totalWeight;
      }
    }

    if (pixels.length > 0) {
      try {
        const k = 4;
        const result = KMeans.kmeans(pixels, k, {
          initialization: 'kmeans++',
        });

        if (result && result.centroids) {
          const counts = new Array(k).fill(0);
          for (const c of result.clusters) counts[c]++;
          const totalSampled = result.clusters.length;

          let bestCentroidIdx = -1;
          let maxScore = -1;

          for (let i = 0; i < k; i++) {
            const [l, a, b] = result.centroids[i] as [number, number, number];
            const share = counts[i] / totalSampled;

            if (share < 0.02) continue;

            const chroma = Math.sqrt(a * a + b * b);

            let score = share * 1.0 + chroma * 6.0;

            if (l < 0.15 || l > 0.95) {
              if (chroma > 0.05) {
                score *= 0.8;
              } else {
                score *= 0.3;
              }
            }

            if (score > maxScore) {
              maxScore = score;
              bestCentroidIdx = i;
            }
          }

          if (bestCentroidIdx === -1) {
            let maxCount = -1;
            for (let i = 0; i < k; i++) {
              if (counts[i] > maxCount) {
                maxCount = counts[i];
                bestCentroidIdx = i;
              }
            }
          }

          const [bestL, bestA, bestB] = result.centroids[bestCentroidIdx];

          const hex = formatHex({
            mode: 'oklab',
            l: bestL,
            a: bestA,
            b: bestB,
          });

          dominantHex = hex || '#808080';
        }
      } catch (e) {
        console.warn('KMeans error:', e);
      }
    }

    return { histogram, dominantHex };
  } catch (err) {
    logError(err, `Error processing ${imageUrl}`);
    const emptyHist = {} as Histogram;
    BIN_NAMES.forEach((b) => (emptyHist[b] = 0));
    return { histogram: emptyHist, dominantHex: '#808080' };
  }
}

function determineSkinType(
  weaponName?: string | null,
): 'weapon' | 'knife' | 'glove' | 'other' {
  if (!weaponName) return 'other';

  const name = weaponName.toLowerCase();

  if (name.includes('glove') || name.includes('wraps')) return 'glove';

  const knifeKeywords = [
    'knife',
    'bayonet',
    'daggers',
    'karambit',
    'bowie',
    'butterfly',
    'falchion',
    'flip',
    'gut',
    'huntsman',
    'navaja',
    'shadow',
    'stiletto',
    'talon',
    'ursus',
    'kukri',
    'classic',
    'nomad',
    'paracord',
    'skeleton',
    'survival',
  ];

  if (knifeKeywords.some((k) => name.includes(k))) return 'knife';
  if (name.includes('zeus')) return 'other';

  return 'weapon';
}

async function processSkin(skin: RawSkinData): Promise<SkinDataForRawInsert> {
  const { histogram, dominantHex } = await extractColorData(skin.image);
  const weaponName = skin.weapon?.name ?? '';
  const rarityName = skin.rarity?.name ?? '';

  const histogramVector = createVectorString(histogram);

  return {
    id: skin.id,
    name: skin.name,
    image: skin.image,
    weapon: weaponName,
    rarity: rarityName,
    type: determineSkinType(weaponName),
    dominantHex,
    histogramVector,
  };
}

async function processAgent(
  agent: RawAgentData,
): Promise<SkinDataForRawInsert> {
  const { histogram, dominantHex } = await extractColorData(agent.image);

  const rarityName = agent.rarity?.name ?? '';
  const histogramVector = createVectorString(histogram);

  let teamCode = 'BOTH';
  if (agent.team?.name === 'Counter-Terrorist') {
    teamCode = 'CT';
  } else if (agent.team?.name === 'Terrorist') {
    teamCode = 'T';
  }

  return {
    id: agent.id,
    name: agent.name,
    image: agent.image,

    weapon: teamCode,
    rarity: rarityName,
    type: 'agent',
    dominantHex,
    histogramVector,
  };
}

async function main(): Promise<void> {
  try {
    const existingSkins = await prisma.skin.findMany({
      select: { id: true },
    });
    const existingIds = new Set(existingSkins.map((s) => s.id));

    if (existingIds.size > 0) {
      console.log(
        `Database currently has ${existingIds.size} items. Checking for new ones...`,
      );
    } else {
      console.log('Database is empty. Starting fresh seed...');
    }

    console.log('Fetching Skins...');
    const skinsResponse = await axios.get<RawSkinData[]>(SKINS_JSON_URL, {
      timeout: 30000,
    });
    if (!Array.isArray(skinsResponse.data)) {
      throw new Error('Invalid skins data format');
    }
    const rawSkins = skinsResponse.data;

    console.log('Fetching Agents...');
    const agentsResponse = await axios.get<RawAgentData[]>(AGENTS_JSON_URL, {
      timeout: 30000,
    });
    if (!Array.isArray(agentsResponse.data)) {
      throw new Error('Invalid agents data format');
    }
    const rawAgents = agentsResponse.data;

    const newSkins = rawSkins.filter((skin) => !existingIds.has(skin.id));
    const newAgents = rawAgents.filter((agent) => !existingIds.has(agent.id));

    console.log(
      `Total items found: ${rawSkins.length + rawAgents.length}. New items to process: ${
        newSkins.length + newAgents.length
      }. (Skipped: ${existingIds.size})`,
    );

    if (newSkins.length === 0 && newAgents.length === 0) {
      console.log('No new items to add. Exiting.');
      return;
    }

    const limit = pLimit(CONCURRENT_DOWNLOADS);
    let processed = 0;
    const totalItems = newSkins.length + newAgents.length;

    const skinPromises = newSkins.map((skin) =>
      limit(async () => {
        const result = await processSkin(skin);
        processed++;
        if (processed % 50 === 0) {
          console.log(
            `Processing: ${processed}/${totalItems} (${Math.round(
              (processed / totalItems) * 100,
            )}%)`,
          );
        }
        return result;
      }),
    );

    const agentPromises = newAgents.map((agent) =>
      limit(async () => {
        const result = await processAgent(agent);
        processed++;
        if (processed % 50 === 0) {
          console.log(
            `Processing: ${processed}/${totalItems} (${Math.round(
              (processed / totalItems) * 100,
            )}%)`,
          );
        }
        return result;
      }),
    );

    const allData = await Promise.all([...skinPromises, ...agentPromises]);

    if (allData.length > 0) {
      console.log('New items processed. Starting database insertion...');

      for (let i = 0; i < allData.length; i += DB_BATCH_SIZE) {
        const batch = allData.slice(i, i + DB_BATCH_SIZE);

        try {
          const values = Prisma.join(
            batch.map(
              (item) =>
                Prisma.sql`(${item.id}, ${item.name}, ${item.image}, ${
                  item.weapon
                }, ${item.rarity}, ${item.type}, ${item.dominantHex}, ${
                  item.histogramVector
                }::vector)`,
            ),
          );

          await prisma.$executeRaw`
            INSERT INTO "Skin" (id, name, image, weapon, rarity, "type", "dominantHex", histogram)
            VALUES ${values}
            ON CONFLICT (id) DO NOTHING;
            `;

          console.log(
            `Inserted ${Math.min(
              i + batch.length,
              allData.length,
            )} / ${allData.length} new items...`,
          );
        } catch (err) {
          logError(err, `Error writing batch ${i / DB_BATCH_SIZE + 1}`);
        }
      }
      console.log(`✓ Successfully added ${allData.length} new items.`);
    } else {
      console.log('No data to insert.');
    }
  } catch (err: unknown) {
    logError(err, 'Seeding error');
    throw err;
  } finally {
    await prisma.$disconnect();
  }
}

main().catch(async (err: unknown) => {
  logError(err, 'Critical error during seeding');
  await prisma.$disconnect();
  process.exit(1);
});
