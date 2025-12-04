import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { SkinDto, SkinWithDistanceDto } from './dto/skin.dto';

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
          SELECT id, name, image, weapon, rarity, type, "dominantHex", histogram::text
          FROM "Skin"
          WHERE id = ${id};
        `,
      ),
    );
    if (result.length === 0) return null;
    return this.parseHistogram(result[0]);
  }

  async findAll(): Promise<SkinDto[]> {
    const result = await safeRawArray<SkinDto>(
      this.prisma.$queryRaw(
        Prisma.sql`SELECT id, name, image, weapon, rarity, type, "dominantHex", histogram::text FROM "Skin"`,
      ),
    );
    return result;
  }

  async findByVector(
    vectorString: string,
    limit: number,
    offset: number = 0,
  ): Promise<SkinWithDistanceDto[]> {
    return safeRawArray<SkinWithDistanceDto>(
      this.prisma.$queryRaw(
        Prisma.sql`
          SELECT id, name, image, weapon, rarity, type, "dominantHex",
                 histogram::text, 
                 (histogram <=> ${vectorString}::vector) AS distance
          FROM "Skin"
          ORDER BY distance ASC
          LIMIT ${limit} OFFSET ${offset}; 
        `,
      ),
    );
  }

  async findAllLoadoutOptions(
    vectorString: string,
    threshold: number,
  ): Promise<SkinWithDistanceDto[]> {
    return safeRawArray<SkinWithDistanceDto>(
      this.prisma.$queryRaw(
        Prisma.sql`
        SELECT * FROM (
          SELECT 
            id, name, image, weapon, rarity, type, "dominantHex",
            histogram::text, 
            (histogram <=> ${vectorString}::vector) AS distance
          FROM "Skin"
          WHERE "weapon" IS NOT NULL AND "weapon" != ''
        ) AS filtered
        WHERE distance < ${threshold}
        ORDER BY distance ASC;
      `,
      ),
    );
  }

  async findByName(
    name: string,
    limit: number,
    offset: number = 0,
  ): Promise<SkinDto[]> {
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
          LIMIT ${limit} OFFSET ${offset}; 
        `,
      ),
    );
    return results.map((skin) => this.parseHistogram(skin));
  }
}
