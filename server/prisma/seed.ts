/* eslint-disable */
import { Prisma, PrismaClient } from '@prisma/client';
import axios from 'axios';
import { oklch, parse } from 'culori';
import * as KMeans from 'ml-kmeans';

import pLimit from 'p-limit';
import sharp from 'sharp';
const SKINS_JSON_URL =
  'https://raw.githubusercontent.com/ByMykel/CSGO-API/main/public/api/en/skins.json';

const prisma = new PrismaClient();
const DB_BATCH_SIZE = 500;
const CONCURRENT_DOWNLOADS = 10;
const TOTAL_BINS = 64;

const CONFIG = {
  IMAGE_RESIZE: { width: 128, height: 128 },
  ALPHA_THRESHOLD: 230,
  ACHROMATIC_THRESHOLD: 0.7,
  LIGHTNESS_BLACK: 0.2,
  LIGHTNESS_WHITE: 0.98,
  CHROMA_GRAY: 0.03,
  REQUEST_TIMEOUT: 15000,
  RETRY_ATTEMPTS: 3,
  RETRY_DELAY: 1000,

  BRIGHTNESS_BOOST: 1.2,
  SATURATION_BOOST: 1.1,
} as const;

interface RawSkinData {
  id: string;
  name: string;
  weapon: { id: string; weapon_id: number; name: string } | null;
  rarity: { id: string; name: string; color: string } | null;
  image: string;
}

interface HexColor {
  hex: () => string;
}

const HUE_BINS = 12;
const HUE_BIN_WIDTH = 360 / HUE_BINS;

const CHROMATIC_BIN_NAMES = [
  'Red',
  'Orange',
  'Yellow',
  'YellowGreen',
  'Green',
  'CyanGreen',
  'Cyan',
  'CyanBlue',
  'Blue',
  'Indigo',
  'Purple',
  'Magenta',
];

const PRIMARY_BIN_NAMES = [
  ...CHROMATIC_BIN_NAMES,
  'Brown',
  'Black',
  'Gray',
  'White',
] as const;

type ColorBin = (typeof PRIMARY_BIN_NAMES)[number] | `Other${number}`;
type Histogram = Record<ColorBin, number>;

const BIN_NAMES: ColorBin[] = [
  ...PRIMARY_BIN_NAMES,
  ...Array.from(
    { length: TOTAL_BINS - PRIMARY_BIN_NAMES.length },
    (_, i) => `Other${i + 1}` as ColorBin,
  ),
];

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

interface OklchColor {
  l: number;
  c: number;
  h: number;
}

function isColor(c: unknown): c is HexColor {
  return (
    typeof c === 'object' &&
    c !== null &&
    'hex' in c &&
    typeof (c as HexColor).hex === 'function'
  );
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

function safeOklch(r: number, g: number, b: number): OklchColor | null {
  try {
    const result = (
      oklch as (color: {
        mode: string;
        r: number;
        g: number;
        b: number;
      }) => Record<string, unknown> | undefined
    )({
      mode: 'rgb',
      r,
      g,
      b,
    });

    if (!result || typeof result !== 'object') return null;

    const l = result.l;
    const c = result.c;
    const h = result.h;

    if (
      typeof l !== 'number' ||
      isNaN(l) ||
      typeof c !== 'number' ||
      isNaN(c) ||
      typeof h !== 'number' ||
      isNaN(h)
    ) {
      return null;
    }

    return { l, c, h: h || 0 };
  } catch {
    return null;
  }
}

function isBoringColor(hex: string): boolean {
  try {
    const p = parse(hex);
    if (!p) return true;

    const col = oklch(p);
    if (!col) return true;

    const l = col.l;
    const c = col.c;

    if (l < 0.1 || l > 0.98) return true;

    if (c < 0.03) return true;

    return false;
  } catch {
    return true;
  }
}
function rgbToHsv(r: number, g: number, b: number) {
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const d = max - min;

  let h = 0;
  if (d !== 0) {
    switch (max) {
      case r:
        h = ((g - b) / d) % 6;
        break;
      case g:
        h = (b - r) / d + 2;
        break;
      case b:
        h = (r - g) / d + 4;
        break;
    }
  }

  h = Math.round(h * 60);
  if (h < 0) h += 360;

  const s = max === 0 ? 0 : d / max;
  const v = max;

  return { h, s, v };
}

function classifyColor(
  r: number,
  g: number,
  b: number,
  a: number,
): ColorBin | null {
  if (a < 30) return null;

  const o = safeOklch(r, g, b);
  if (!o) return 'Gray';

  const { l, c } = o;

  if (l < 0.12) return 'Black';
  if (l > 0.97) return 'White';
  if (c < 0.025) return 'Gray';

  const { h } = rgbToHsv(r, g, b);

  if (h >= 20 && h <= 75 && l < 0.55 && c < 0.1) {
    return 'Brown';
  }

  const hueIndex = Math.floor(h / HUE_BIN_WIDTH) % HUE_BINS;
  return CHROMATIC_BIN_NAMES[hueIndex] || 'Red';
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
  throw lastErr ?? new Error('Unknown fetch error');
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
  const histogram: Histogram = Object.fromEntries(
    BIN_NAMES.map((k) => [k, 0]),
  ) as Histogram;
  let dominantHex = '#808080';

  try {
    const buffer = await fetchWithRetry(imageUrl);

    const { data } = await sharp(buffer)
      .ensureAlpha()
      .resize(CONFIG.IMAGE_RESIZE.width, CONFIG.IMAGE_RESIZE.height, {
        fit: 'inside',
        kernel: 'lanczos3',
      })
      .modulate({
        brightness: CONFIG.BRIGHTNESS_BOOST,
        saturation: CONFIG.SATURATION_BOOST,
      })
      .raw()
      .toBuffer({ resolveWithObject: true });

    const pixels: number[][] = [];
    let actualPixels = 0;

    for (let i = 0; i < data.length; i += 4) {
      const r = data[i] / 255;
      const g = data[i + 1] / 255;
      const b = data[i + 2] / 255;
      const a = data[i + 3];

      if (a < CONFIG.ALPHA_THRESHOLD) continue;

      const bin = classifyColor(r, g, b, a);
      if (bin) histogram[bin]++;
      actualPixels++;
      const hex = rgbToHex(r * 255, g * 255, b * 255);
      if (!isBoringColor(hex)) pixels.push([r * 255, g * 255, b * 255]);
    }

    if (actualPixels > 0) {
      BIN_NAMES.forEach((k) => {
        histogram[k] = histogram[k] / actualPixels;
      });
    }

    if (pixels.length > 0) {
      let dominantHexCandidate = '#808080';
      try {
        const k = Math.min(4, pixels.length);
        const kmeansResult = KMeans.kmeans(pixels, k, {
          initialization: 'kmeans++',
        });

        if (
          kmeansResult &&
          Array.isArray(kmeansResult.centroids) &&
          Array.isArray(kmeansResult.clusters) &&
          kmeansResult.centroids.length > 0
        ) {
          const centroids = kmeansResult.centroids as number[][];

          const counts = new Array(centroids.length).fill(0);
          kmeansResult.clusters.forEach((label) => {
            if (label >= 0 && label < counts.length) counts[label]++;
          });

          const domIndex = counts.indexOf(Math.max(...counts));
          if (centroids[domIndex]) {
            const [dr, dg, db] = centroids[domIndex].map((v) =>
              Math.max(0, Math.min(255, v)),
            );
            dominantHexCandidate = rgbToHex(dr, dg, db);
          }
        }
      } catch (err) {
        logError(err, `KMeans failed for ${imageUrl}, fallback to gray`);
      }

      dominantHex = dominantHexCandidate;
    }

    return { histogram, dominantHex };
  } catch (err) {
    logError(err, `Error extracting data for ${imageUrl}`);
    return { histogram, dominantHex };
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
  ];
  if (knifeKeywords.some((k) => name.includes(k))) return 'knife';

  if (name.includes('zeus')) return 'other';

  return 'weapon';
}

function histogramToVector(histogram: Histogram): number[] {
  const vector = Array(TOTAL_BINS).fill(0);

  BIN_NAMES.forEach((bin, idx) => {
    vector[idx] = histogram[bin] || 0;
  });

  const sum = vector.reduce((a, b) => a + b, 0) || 1;
  return vector.map((v) => v / sum);
}

function createVectorString(histogram: Histogram): string {
  const vector = histogramToVector(histogram);

  if (vector.length !== TOTAL_BINS) {
    throw new Error(
      `Vector must have exactly ${TOTAL_BINS} dimensions, got ${vector.length}`,
    );
  }

  return `[${vector.join(',')}]`;
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

async function main(): Promise<void> {
  try {
    const skinCount = await prisma.skin.count();

    if (skinCount > 0) {
      console.log(`Database already has ${skinCount} skins. Seeding skipped.`);
      console.log('To reseed, delete existing data first.');
      return;
    }

    console.log('Database empty. Starting seeding...');
    console.log(
      `Using brightness boost: ${CONFIG.BRIGHTNESS_BOOST}x, saturation boost: ${CONFIG.SATURATION_BOOST}x`,
    );

    const response = await axios.get<RawSkinData[]>(SKINS_JSON_URL, {
      timeout: 30000,
    });

    if (!Array.isArray(response.data)) {
      throw new Error('Invalid data format: expected array');
    }

    const rawSkins = response.data;
    console.log(`Found ${rawSkins.length} skins to process...`);

    const limit = pLimit(CONCURRENT_DOWNLOADS);
    let processed = 0;

    const allSkinsData = await Promise.all(
      rawSkins.map((skin) =>
        limit(async () => {
          const result = await processSkin(skin);
          processed++;
          if (processed % 50 === 0) {
            console.log(
              `Processing: ${processed}/${rawSkins.length} (${Math.round((processed / rawSkins.length) * 100)}%)`,
            );
          }
          return result;
        }),
      ),
    );

    console.log('All images processed. Starting database write...');

    for (let i = 0; i < allSkinsData.length; i += DB_BATCH_SIZE) {
      const batch = allSkinsData.slice(i, i + DB_BATCH_SIZE);

      try {
        const values = Prisma.join(
          batch.map(
            (skin) =>
              Prisma.sql`(${skin.id}, ${skin.name}, ${skin.image}, ${skin.weapon}, ${skin.rarity}, ${skin.type}, ${skin.dominantHex}, ${skin.histogramVector}::vector)`,
          ),
        );

        await prisma.$executeRaw`
          INSERT INTO "Skin" (id, name, image, weapon, rarity, "type", "dominantHex", histogram)
          VALUES ${values}
          ON CONFLICT (id) DO NOTHING;
        `;

        console.log(
          `Written ${Math.min(i + batch.length, allSkinsData.length)} / ${allSkinsData.length} skins to DB...`,
        );
      } catch (err) {
        logError(err, `Error writing batch ${i / DB_BATCH_SIZE + 1}`);
      }
    }

    console.log(`✓ Successfully inserted ${allSkinsData.length} skins.`);
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
