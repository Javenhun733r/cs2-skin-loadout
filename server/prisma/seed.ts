/* eslint-disable */
import { Prisma, PrismaClient } from '@prisma/client';
import axios from 'axios';
import { oklch, parse } from 'culori';
import getColors from 'get-image-colors';
import pLimit from 'p-limit';
import sharp from 'sharp';

const SKINS_JSON_URL =
  'https://raw.githubusercontent.com/ByMykel/CSGO-API/main/public/api/en/skins.json';

const prisma = new PrismaClient();
const DB_BATCH_SIZE = 500;
const CONCURRENT_DOWNLOADS = 10;
const TOTAL_BINS = 64;

// Improved configuration
const CONFIG = {
  IMAGE_RESIZE: { width: 128, height: 128 },
  ALPHA_THRESHOLD: 230,
  ACHROMATIC_THRESHOLD: 0.7,
  LIGHTNESS_BLACK: 0.1,
  LIGHTNESS_WHITE: 0.95,
  CHROMA_GRAY: 0.05,
  REQUEST_TIMEOUT: 15000,
  RETRY_ATTEMPTS: 3,
  RETRY_DELAY: 1000,
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

type ColorBin =
  | 'Red'
  | 'Orange'
  | 'Yellow'
  | 'YellowGreen'
  | 'Green'
  | 'CyanGreen'
  | 'Cyan'
  | 'CyanBlue'
  | 'Blue'
  | 'Indigo'
  | 'Purple'
  | 'Magenta'
  | 'Pink'
  | 'RedPink'
  | 'RedDark'
  | 'Brown1'
  | 'Brown2'
  | 'GrayDark'
  | 'Gray'
  | 'GrayLight'
  | 'Black'
  | 'White'
  | 'Other1'
  | 'Other2'
  | `Other${string}`;

type Histogram = Record<ColorBin, number>;

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

const BIN_NAMES: ColorBin[] = [
  'Red',
  'RedPink',
  'Pink',
  'Magenta',
  'Purple',
  'Indigo',
  'Blue',
  'CyanBlue',
  'Cyan',
  'CyanGreen',
  'Green',
  'YellowGreen',
  'Yellow',
  'Orange',
  'RedDark',
  'Brown1',
  'Brown2',
  'GrayDark',
  'Gray',
  'GrayLight',
  'Black',
  'White',
  'Other1',
  'Other2',
  ...Array.from(
    { length: TOTAL_BINS - 24 },
    (_, i) => `Other${i + 3}` as ColorBin,
  ),
];

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

// Type-safe color conversion
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
      typeof c !== 'number' ||
      typeof h !== 'number'
    ) {
      return null;
    }

    return { l, c, h: h || 0 };
  } catch {
    return null;
  }
}

// Improved boring color detection with better thresholds
function isBoringColor(hex: string): boolean {
  try {
    const parsed = (
      parse as (color: string) => Record<string, unknown> | null | undefined
    )(hex);
    if (!parsed) return true;

    const color = (
      oklch as (
        color: Record<string, unknown>,
      ) => Record<string, unknown> | undefined
    )(parsed);
    if (!color || typeof color !== 'object') return true;

    const l = color.l;
    const c = color.c;

    if (typeof l !== 'number' || typeof c !== 'number') return true;

    // More nuanced boring color detection
    if (l < 0.15 || l > 0.95) return true;
    if (c < 0.05) return true;

    // Additional check: middle gray range
    if (l > 0.4 && l < 0.6 && c < 0.08) return true;

    return false;
  } catch {
    return true;
  }
}

// Improved color classification with better binning
function classifyColor(
  r: number,
  g: number,
  b: number,
  a: number,
): ColorBin | null {
  if (a < CONFIG.ALPHA_THRESHOLD) return null;

  const color = safeOklch(r, g, b);
  if (!color) return 'Black';

  const { l, c, h } = color;

  // Handle achromatic colors first
  if (l < CONFIG.LIGHTNESS_BLACK) return 'Black';
  if (l > CONFIG.LIGHTNESS_WHITE) return 'White';

  // Gray scale detection with better granularity
  if (c < CONFIG.CHROMA_GRAY) {
    if (l < 0.3) return 'GrayDark';
    if (l < 0.7) return 'Gray';
    return 'GrayLight';
  }

  // Chromatic color binning with better hue handling
  const hueSector = Math.floor((h % 360) / (360 / TOTAL_BINS)) % TOTAL_BINS;
  return BIN_NAMES[hueSector] || 'Red';
}

// Retry logic for network requests
async function fetchWithRetry(
  url: string,
  attempts: number = CONFIG.RETRY_ATTEMPTS,
): Promise<Buffer> {
  let lastError: unknown;

  for (let i = 0; i < attempts; i++) {
    try {
      const response = await axios.get<ArrayBuffer>(url, {
        responseType: 'arraybuffer',
        timeout: CONFIG.REQUEST_TIMEOUT,
      });
      return Buffer.from(response.data);
    } catch (err) {
      lastError = err;
      if (i < attempts - 1) {
        await new Promise((resolve) =>
          setTimeout(resolve, CONFIG.RETRY_DELAY * (i + 1)),
        );
      }
    }
  }

  throw lastError;
}

// Improved color extraction with better dominant color selection
async function extractColorData(
  imageUrl: string,
): Promise<{ histogram: Histogram; dominantHex: string }> {
  const histogram: Histogram = Object.fromEntries(
    BIN_NAMES.map((k) => [k, 0]),
  ) as Histogram;

  let dominantHex = '#808080';

  try {
    const buffer = await fetchWithRetry(imageUrl);
    const metadata = await sharp(buffer).metadata();
    const format = metadata.format || 'webp';

    // Extract dominant colors
    const colors = (await getColors(buffer, {
      type: `image/${format}`,
      count: 15,
    })) as unknown[];

    const allHexColors: string[] = colors.filter(isColor).map((c) => c.hex());

    if (allHexColors.length > 0) {
      const interestingColors = allHexColors.filter((h) => !isBoringColor(h));
      const boringCount = allHexColors.length - interestingColors.length;
      const isAchromatic =
        boringCount / allHexColors.length > CONFIG.ACHROMATIC_THRESHOLD;

      // Better dominant color selection
      if (isAchromatic) {
        dominantHex = allHexColors[0];
      } else {
        dominantHex = interestingColors[0] || allHexColors[0];
      }
    }

    // Process pixel histogram with improved resolution
    const { data } = await sharp(buffer)
      .ensureAlpha()
      .resize(CONFIG.IMAGE_RESIZE.width, CONFIG.IMAGE_RESIZE.height, {
        fit: 'inside',
        kernel: 'lanczos3',
      })
      .raw()
      .toBuffer({ resolveWithObject: true });

    let actualPixels = 0;

    // Process pixels in a more efficient way
    for (let i = 0; i < data.length; i += 4) {
      const a = data[i + 3];
      if (a < CONFIG.ALPHA_THRESHOLD) continue;

      const r = data[i] / 255;
      const g = data[i + 1] / 255;
      const b = data[i + 2] / 255;

      const bin = classifyColor(r, g, b, a);
      if (bin) {
        histogram[bin]++;
        actualPixels++;
      }
    }

    // Normalize histogram
    if (actualPixels > 0) {
      BIN_NAMES.forEach((k) => {
        histogram[k] = histogram[k] / actualPixels;
      });
    }

    return { histogram, dominantHex };
  } catch (err: unknown) {
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

// Improved histogram to vector conversion with dominant color boost
function histogramToVector(
  histogram: Histogram,
  dominantHex?: string,
): number[] {
  const vector = Array(TOTAL_BINS).fill(0);

  // Fill base histogram
  BIN_NAMES.forEach((bin, idx) => {
    vector[idx] = histogram[bin] || 0;
  });

  // Boost dominant color bin for better matching
  if (dominantHex) {
    try {
      const domColor = (
        parse as (color: string) => Record<string, unknown> | null | undefined
      )(dominantHex);
      if (domColor) {
        const domOklch = (
          oklch as (
            color: Record<string, unknown>,
          ) => Record<string, unknown> | undefined
        )(domColor);
        if (domOklch && typeof domOklch === 'object') {
          const h = domOklch.h;
          if (typeof h === 'number') {
            const sector =
              Math.floor((h % 360) / (360 / TOTAL_BINS)) % TOTAL_BINS;
            vector[sector] = Math.min(1, vector[sector] + 0.15);
          }
        }
      }
    } catch {
      // Silently fail if dominant color parsing fails
    }
  }

  // Normalize vector
  const sum = vector.reduce((a, b) => a + b, 0) || 1;
  return vector.map((v) => v / sum);
}

function createVectorString(
  histogram: Histogram,
  dominantHex?: string,
): string {
  const vector = histogramToVector(histogram, dominantHex);
  return `[${vector.join(',')}]`;
}

async function processSkin(skin: RawSkinData): Promise<SkinDataForRawInsert> {
  const { histogram, dominantHex } = await extractColorData(skin.image);
  const weaponName = skin.weapon?.name ?? '';
  const rarityName = skin.rarity?.name ?? '';
  const histogramVector = createVectorString(histogram, dominantHex);

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

    // Process with progress tracking
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

    // Batch insert with better error handling
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
