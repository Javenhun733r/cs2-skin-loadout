import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { oklch, parse } from 'culori';
import { PrismaService } from '../prisma/prisma.service';
import {
  FindByHistogramRepoDto,
  FindLoadoutRepoDto,
  SkinDto,
  SkinWithDistanceDto,
} from './dto/skin.dto';

type OklchColor = {
  l: number;
  c: number;
  h: number;
};

function safeParseColor(hex: string): OklchColor | null {
  try {
    const parsed = (
      parse as (color: string) => Record<string, unknown> | null | undefined
    )(hex);
    if (!parsed || typeof parsed !== 'object') return null;

    const converted = (
      oklch as (
        color: Record<string, unknown>,
      ) => Record<string, unknown> | null | undefined
    )(parsed);
    if (!converted || typeof converted !== 'object') {
      return null;
    }

    const l = converted.l;
    const c = converted.c;
    const h = converted.h;

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

async function safeRawArray<T>(promise: Promise<unknown>): Promise<T[]> {
  const result = await promise;
  if (!Array.isArray(result)) return [];
  return result as T[];
}

@Injectable()
export class SkinsRepository {
  constructor(private readonly prisma: PrismaService) {}

  private parseHistogram(skin: SkinDto): SkinDto {
    if (typeof skin.histogram === 'string') {
      try {
        const parsedValue: unknown = JSON.parse(skin.histogram);
        if (Array.isArray(parsedValue)) {
          parsedValue.forEach((v, i) => {
            (skin as Record<string, number>)[`hist${i}`] =
              typeof v === 'number' ? v : 0;
          });
        }
      } catch {
        /* empty */
      }
    }
    return skin;
  }

  async findById(id: string): Promise<SkinDto | null> {
    const result = await safeRawArray<SkinDto>(
      this.prisma.$queryRaw(
        Prisma.sql`
          SELECT id, name, image, weapon, rarity, type, "dominantHex",
                 histogram::text
          FROM "Skin"
          WHERE id = ${id};
        `,
      ),
    );

    if (result.length === 0) return null;
    return this.parseHistogram(result[0]);
  }

  async findByHistogram(
    dto: FindByHistogramRepoDto & { targetColor?: string },
  ): Promise<SkinWithDistanceDto[]> {
    const { targetVector, targetColor, limit } = dto;

    if (targetColor) {
      const target = safeParseColor(targetColor);
      if (!target) return [];

      const results = await safeRawArray<SkinDto>(
        this.prisma.$queryRaw(
          Prisma.sql`
            SELECT id, name, image, weapon, rarity, type, "dominantHex", histogram::text
            FROM "Skin";
          `,
        ),
      );

      return results
        .map((skin) => {
          const parsed = safeParseColor(skin.dominantHex);
          if (!parsed) return null;

          const skinColor: OklchColor = {
            l: parsed.l,
            c: parsed.c,
            h: parsed.h,
          };

          const targetColorSafe: OklchColor = {
            l: target.l,
            c: target.c,
            h: target.h,
          };

          const deltaL = skinColor.l - targetColorSafe.l;
          const deltaC = skinColor.c - targetColorSafe.c;

          const hDiff = (skinColor.h - targetColorSafe.h) * (Math.PI / 180);
          const deltaH =
            Math.sin(hDiff) * Math.min(skinColor.c, targetColorSafe.c);

          const distance = Math.sqrt(deltaL ** 2 + deltaC ** 2 + deltaH ** 2);

          return { ...skin, distance };
        })
        .filter((s): s is SkinWithDistanceDto => s !== null)
        .sort((a, b) => a.distance - b.distance)
        .slice(0, limit);
    }

    const values = Object.values(targetVector);
    const sum = values.reduce((a, b) => a + b, 0) || 1;
    const normalized = values.map((v) => v / sum);
    const vectorString = `[${normalized.join(',')}]`;

    return safeRawArray<SkinWithDistanceDto>(
      this.prisma.$queryRaw(
        Prisma.sql`
          SELECT id, name, image, weapon, rarity, type, "dominantHex",
                 histogram::text, 
                 (histogram <=> ${vectorString}::vector) AS distance
          FROM "Skin"
          ORDER BY distance ASC
          LIMIT ${limit};
        `,
      ),
    );
  }

  async findAllLoadoutOptionsByColor(
    dto: FindLoadoutRepoDto,
  ): Promise<SkinWithDistanceDto[]> {
    const { targetVector } = dto;
    const threshold = dto.threshold || 0.5;

    const values = Object.values(targetVector);
    const sum = values.reduce((a, b) => a + b, 0) || 1;
    const normalized = values.map((v) => v / sum);
    const vectorString = `[${normalized.join(',')}]`;

    return safeRawArray<SkinWithDistanceDto>(
      this.prisma.$queryRaw(
        Prisma.sql`
          SELECT *
          FROM (
            SELECT * FROM (
              (
                SELECT DISTINCT ON ("weapon")
                  id, name, image, weapon, rarity, type, "dominantHex",
                  histogram::text, 
                  (histogram <=> ${vectorString}::vector) AS distance
                FROM "Skin"
                WHERE "type" = 'weapon'
                  AND "weapon" IS NOT NULL AND "weapon" != ''
                ORDER BY "weapon", distance ASC
              )
              UNION ALL
              (
                SELECT DISTINCT ON ("weapon")
                  id, name, image, weapon, rarity, type, "dominantHex",
                  histogram::text, 
                  (histogram <=> ${vectorString}::vector) AS distance
                FROM "Skin"
                WHERE "type" IN ('knife', 'glove')
                  AND "weapon" IS NOT NULL AND "weapon" != ''
                ORDER BY "weapon", distance ASC
              )
            ) AS loadouts
          ) AS filtered
          WHERE distance < ${threshold}
          ORDER BY distance ASC;
        `,
      ),
    );
  }

  async findByName(name: string, limit: number): Promise<SkinDto[]> {
    const searchTerms = name.split(' ').filter(Boolean);
    if (searchTerms.length === 0) return [];

    const whereClauses = searchTerms.map(
      (term) => Prisma.sql`name ILIKE ${'%' + term + '%'}`,
    );
    const whereSql = Prisma.join(whereClauses, ' AND ');

    const results = await safeRawArray<SkinDto>(
      this.prisma.$queryRaw(
        Prisma.sql`
          SELECT id, name, image, weapon, rarity, type, "dominantHex", histogram::text
          FROM "Skin"
          WHERE ${whereSql}
          LIMIT ${limit};
        `,
      ),
    );

    return results.map((skin) => this.parseHistogram(skin));
  }
}
