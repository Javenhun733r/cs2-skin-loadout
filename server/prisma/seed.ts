/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import { Prisma, PrismaClient } from '@prisma/client';
import axios from 'axios';
import * as KMeans from 'ml-kmeans';
import pLimit from 'p-limit';
import sharp from 'sharp';

import {
  BIN_NAMES,
  classifyColor,
  createVectorString,
  safeOklch,
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

function rgbToHex(r: number, g: number, b: number) {
  const toHex = (x: number) => {
    const h = Math.round(x).toString(16);
    return h.length === 1 ? '0' + h : h;
  };
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
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
        saturation: 1.2,
        brightness: 1.0,
      })
      .raw()
      .toBuffer({ resolveWithObject: true });

    const pixels: number[][] = [];
    let actualPixels = 0;

    for (let i = 0; i < data.length; i += 4) {
      const r = data[i];
      const g = data[i + 1];
      const b = data[i + 2];
      const a = data[i + 3];

      if (a < CONFIG.ALPHA_THRESHOLD) continue;

      const bin = classifyColor(r / 255, g / 255, b / 255, a);
      if (bin) {
        histogram[bin] = (histogram[bin] || 0) + 1;
      }

      actualPixels++;

      if (actualPixels % 5 === 0) {
        pixels.push([r, g, b]);
      }
    }

    if (actualPixels > 0) {
      for (const key of BIN_NAMES) {
        histogram[key] = (histogram[key] || 0) / actualPixels;
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
            const [r, g, b] = result.centroids[i] as [number, number, number];
            const share = counts[i] / totalSampled;

            if (share < 0.05) continue;

            const oklch = safeOklch(r / 255, g / 255, b / 255);
            const chroma = oklch?.c || 0;

            let score = share * 1.0 + chroma * 3.0;

            if (oklch && (oklch.l < 0.15 || oklch.l > 0.95)) {
              score *= 0.5;
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

          const centroid = result.centroids[bestCentroidIdx] as [
            number,
            number,
            number,
          ];
          dominantHex = rgbToHex(centroid[0], centroid[1], centroid[2]);
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
    const skinCount = await prisma.skin.count();
    if (skinCount > 0) {
      console.log(`Database currently has ${skinCount} items.`);
    }

    console.log('Starting seeding process...');

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

    console.log(
      `Found ${rawSkins.length} skins and ${rawAgents.length} agents.`,
    );

    const limit = pLimit(CONCURRENT_DOWNLOADS);
    let processed = 0;
    const totalItems = rawSkins.length + rawAgents.length;

    const skinPromises = rawSkins.map((skin) =>
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

    const agentPromises = rawAgents.map((agent) =>
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

    console.log('All images processed. Starting database upsert...');

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
          ON CONFLICT (id) DO UPDATE SET
            "histogram" = EXCLUDED."histogram",
            "dominantHex" = EXCLUDED."dominantHex",
            "type" = EXCLUDED."type",
            "weapon" = EXCLUDED."weapon";
        `;

        console.log(
          `Upserted ${Math.min(
            i + batch.length,
            allData.length,
          )} / ${allData.length} items...`,
        );
      } catch (err) {
        logError(err, `Error writing batch ${i / DB_BATCH_SIZE + 1}`);
      }
    }

    console.log(`✓ Successfully processed ${allData.length} items.`);
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
