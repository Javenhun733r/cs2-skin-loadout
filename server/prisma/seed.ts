/* eslint-disable  */
import { Prisma, PrismaClient } from '@prisma/client';
import axios from 'axios';
import { oklch, parse, type Color, type Oklch } from 'culori';
import getColors from 'get-image-colors';
import pLimit from 'p-limit';
import sharp from 'sharp';

const SKINS_JSON_URL =
  'https://raw.githubusercontent.com/ByMykel/CSGO-API/main/public/api/en/skins.json';

const prisma = new PrismaClient();
const DB_BATCH_SIZE = 500;
const CONCURRENT_DOWNLOADS = 10;

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
  | 'histRed'
  | 'histOrange'
  | 'histYellow'
  | 'histGreen'
  | 'histCyan'
  | 'histBlue'
  | 'histPurple'
  | 'histPink'
  | 'histBrown'
  | 'histBlack'
  | 'histGray'
  | 'histWhite';

type Histogram = Record<ColorBin, number>;

function isColor(c: unknown): c is HexColor {
  return (
    typeof c === 'object' &&
    c !== null &&
    'hex' in c &&
    typeof (c as Record<string, unknown>).hex === 'function'
  );
}

function getErrorMessage(err: unknown): string {
  if (err instanceof Error) return err.message;
  if (typeof err === 'string') return err;
  return JSON.stringify(err);
}

function logError(err: unknown, context?: string) {
  const message = getErrorMessage(err);
  if (context) console.error(`${context}: ${message}`);
  else console.error(message);
}

function safeOklch(
  r: number,
  g: number,
  b: number,
): { l: number; c: number; h: number } | null {
  try {
    const result = oklch({ mode: 'rgb', r, g, b });
    if (!result || typeof result !== 'object') return null;
    const l = result.l;
    const c = result.c;
    const h = result.h || 0;
    if (
      typeof l !== 'number' ||
      typeof c !== 'number' ||
      typeof h !== 'number'
    ) {
      return null;
    }
    return { l, c, h };
  } catch {
    return null;
  }
}

function isBoringColor(hex: string): boolean {
  try {
    const parsed: Color | undefined = parse(hex);
    if (!parsed) return true;
    const color: Oklch | undefined = oklch(parsed);
    if (!color) return true;
    if (color.l < 0.15 || color.l > 0.95 || color.c < 0.05) return true;
    return false;
  } catch {
    return true;
  }
}

function classifyColor(
  r: number,
  g: number,
  b: number,
  a: number,
): ColorBin | null {
  if (a < 230) {
    return null;
  }

  const color = safeOklch(r, g, b);
  if (!color) return 'histBlack';

  const { l, c, h } = color;
  if (l < 0.15) return 'histBlack';
  if (l > 0.95) return 'histWhite';
  if (c < 0.05) return 'histGray';
  if (h >= 15 && h < 45) return 'histOrange';
  if (h >= 45 && h < 75) return 'histBrown';
  if (h >= 75 && h < 105) return 'histYellow';
  if (h >= 105 && h < 165) return 'histGreen';
  if (h >= 165 && h < 210) return 'histCyan';
  if (h >= 210 && h < 285) return 'histBlue';
  if (h >= 285 && h < 330) return 'histPurple';
  if (h >= 330 && h < 350) return 'histPink';
  return 'histRed';
}

async function extractColorData(
  imageUrl: string,
): Promise<{ histogram: Histogram; dominantHex: string }> {
  const histogram: Histogram = {
    histRed: 0,
    histOrange: 0,
    histYellow: 0,
    histGreen: 0,
    histCyan: 0,
    histBlue: 0,
    histPurple: 0,
    histPink: 0,
    histBrown: 0,
    histBlack: 0,
    histGray: 0,
    histWhite: 0,
  };
  let dominantHex = '#808080';

  try {
    const response = await axios.get<ArrayBuffer>(imageUrl, {
      responseType: 'arraybuffer',
      timeout: 10000,
    });
    const buffer = Buffer.from(response.data);

    const colors = (await getColors(buffer, {
      type: 'image/png',
      count: 10,
    })) as unknown[];

    const allHexColors: string[] = [];
    if (Array.isArray(colors)) {
      for (const color of colors) {
        if (isColor(color)) {
          allHexColors.push(color.hex());
        }
      }
    }

    if (allHexColors.length > 0) {
      const boringCount = allHexColors.filter(isBoringColor).length;
      const isAchromaticSkin = boringCount / allHexColors.length > 0.7;
      if (isAchromaticSkin) {
        dominantHex = allHexColors[0];
      } else {
        dominantHex =
          allHexColors.find((hex) => !isBoringColor(hex)) || allHexColors[0];
      }
    }

    const { data, info } = await sharp(buffer)
      .ensureAlpha()
      .resize(100, 100, { fit: 'inside' })
      .raw()
      .toBuffer({ resolveWithObject: true });

    let actualPixels = 0;
    for (let i = 0; i < data.length; i += 4) {
      const a = data[i + 3];
      if (a < 230) continue;

      const r = data[i] / 255;
      const g = data[i + 1] / 255;
      const b = data[i + 2] / 255;

      const bin = classifyColor(r, g, b, a);
      if (bin) {
        histogram[bin]++;
        actualPixels++;
      }
    }

    if (actualPixels > 0) {
      (Object.keys(histogram) as ColorBin[]).forEach(
        (k) => (histogram[k] /= actualPixels),
      );
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
  if (['knife', 'bayonet', 'daggers', 'karambit'].some((k) => name.includes(k)))
    return 'knife';
  if (name.includes('zeus')) return 'other';
  return 'weapon';
}

async function processSkin(
  skin: RawSkinData,
): Promise<Prisma.SkinCreateManyInput> {
  const { histogram, dominantHex } = await extractColorData(skin.image);

  const weaponName = skin.weapon?.name ?? '';
  const rarityName = skin.rarity?.name ?? '';

  return {
    id: skin.id,
    name: skin.name,
    image: skin.image,
    weapon: weaponName,
    rarity: rarityName,
    type: determineSkinType(weaponName),
    dominantHex: dominantHex,
    ...histogram,
  };
}

async function main(): Promise<void> {
  try {
    const skinCount = await prisma.skin.count();
    if (skinCount > 0) {
      console.log(`Database already has ${skinCount} skins. Seeding skipped.`);
      return;
    }

    console.log('Database empty. Starting seeding...');
    const response = await axios.get<RawSkinData[]>(SKINS_JSON_URL);
    if (!Array.isArray(response.data)) throw new Error('Data is not an array');

    const rawSkins = response.data;
    console.log(`Found ${rawSkins.length} skins to process...`);

    const limit = pLimit(CONCURRENT_DOWNLOADS);
    const allSkinsData = await Promise.all(
      rawSkins.map((skin) => limit(() => processSkin(skin))),
    );

    console.log('All images processed. Starting database write...');
    for (let i = 0; i < allSkinsData.length; i += DB_BATCH_SIZE) {
      const batch = allSkinsData.slice(i, i + DB_BATCH_SIZE);
      await prisma.skin.createMany({ data: batch, skipDuplicates: true });
      console.log(
        `Written ${i + batch.length} / ${allSkinsData.length} skins to DB...`,
      );
    }

    console.log(`Successfully inserted ${allSkinsData.length} skins.`);
  } catch (err: unknown) {
    logError(err, 'Seeding error');
  } finally {
    await prisma.$disconnect();
  }
}

main().catch(async (err: unknown) => {
  logError(err, 'Critical error during seeding');
  await prisma.$disconnect();
  process.exit(1);
});
