import { Prisma, PrismaClient } from '@prisma/client';
import axios from 'axios';
import getColors from 'get-image-colors';

const SKINS_JSON_URL =
  'https://raw.githubusercontent.com/ByMykel/CSGO-API/main/public/api/en/skins.json';

const prisma = new PrismaClient();
const BATCH_SIZE = 100;

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
function isError(e: unknown): e is Error {
  return e instanceof Error;
}
function isColor(c: unknown): c is HexColor {
  return (
    typeof c === 'object' &&
    c !== null &&
    'hex' in c &&
    typeof (c as Record<string, unknown>).hex === 'function'
  );
}

async function extractMainColors(
  imageUrl: string,
): Promise<[string, string, string]> {
  try {
    const response = await axios.get<ArrayBuffer>(imageUrl, {
      responseType: 'arraybuffer',
    });
    const buffer = Buffer.from(response.data);

    const colors = (await getColors(buffer, {
      type: 'image/png',
    })) as unknown[];

    const hexColors: [string, string, string] = [
      '#000000',
      '#000000',
      '#000000',
    ];

    for (let i = 0; i < 3; i++) {
      const color = colors[i];
      if (isColor(color)) {
        hexColors[i] = color.hex();
      }
    }

    return hexColors;
  } catch (err: unknown) {
    const message = isError(err) ? err.message : String(err);
    console.error('Error extracting colors for', imageUrl, message);
    return ['#ffffff', '#cccccc', '#000000'];
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

async function main() {
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

    const skinsToCreate: Prisma.SkinCreateManyInput[] = [];

    for (let i = 0; i < rawSkins.length; i += BATCH_SIZE) {
      const batch = rawSkins.slice(i, i + BATCH_SIZE);

      const batchResults = await Promise.all(
        batch.map(async (skin) => {
          const [primaryColorHex, secondaryColorHex, accentColorHex] =
            await extractMainColors(skin.image);

          const weaponName = skin.weapon?.name ?? '';
          const rarityName = skin.rarity?.name ?? '';
          const primaryRgb = hexToRgb(primaryColorHex);
          const secondaryRgb = hexToRgb(secondaryColorHex);
          const accentRgb = hexToRgb(accentColorHex);
          return {
            id: skin.id,
            name: skin.name,
            image: skin.image,
            weapon: weaponName,
            rarity: rarityName,
            type: determineSkinType(weaponName),
            primaryR: primaryRgb.r,
            primaryG: primaryRgb.g,
            primaryB: primaryRgb.b,
            secondaryR: secondaryRgb.r,
            secondaryG: secondaryRgb.g,
            secondaryB: secondaryRgb.b,
            accentR: accentRgb.r,
            accentG: accentRgb.g,
            accentB: accentRgb.b,
          } satisfies Prisma.SkinCreateManyInput;
        }),
      );

      skinsToCreate.push(...batchResults);
      console.log(
        `Processed ${i + batch.length} / ${rawSkins.length} skins...`,
      );
    }

    await prisma.skin.createMany({
      data: skinsToCreate,
      skipDuplicates: true,
    });

    console.log(`Successfully inserted ${skinsToCreate.length} skins.`);
  } catch (err: unknown) {
    const message = isError(err) ? err.message : String(err);
    console.error('Seeding error:', message);
  } finally {
    await prisma.$disconnect();
  }
}
function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result
    ? {
        r: parseInt(result[1], 16),
        g: parseInt(result[2], 16),
        b: parseInt(result[3], 16),
      }
    : { r: 0, g: 0, b: 0 };
}
main().catch(async (err: unknown) => {
  const message = isError(err) ? err.message : String(err);
  console.error('Critical error during seeding:', message);
  await prisma.$disconnect();
  process.exit(1);
});
