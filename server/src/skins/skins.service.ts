import { Injectable } from '@nestjs/common';
import { Prisma, Skin } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

interface RgbColor {
  r: number;
  g: number;
  b: number;
}

@Injectable()
export class SkinsService {
  constructor(private prisma: PrismaService) {}
  async findSkinsByColor(
    hexColor: string,
    limit: number = 20,
  ): Promise<(Skin & { distance: number })[]> {
    const targetRgb = this.hexToRgb(hexColor);
    if (!targetRgb) {
      throw new Error('Invalid HEX color format.');
    }

    const { r, g, b } = targetRgb;

    const query = Prisma.sql`
      SELECT
        *,
        LEAST(
          sqrt(pow("primaryR" - ${r}, 2) + pow("primaryG" - ${g}, 2) + pow("primaryB" - ${b}, 2)),
          sqrt(pow("secondaryR" - ${r}, 2) + pow("secondaryG" - ${g}, 2) + pow("secondaryB" - ${b}, 2)),
          sqrt(pow("accentR" - ${r}, 2) + pow("accentG" - ${g}, 2) + pow("accentB" - ${b}, 2))
        ) AS distance
      FROM
        "Skin"
      ORDER BY
        distance ASC
      LIMIT
        ${limit};
    `;

    const skins =
      await this.prisma.$queryRaw<(Skin & { distance: number })[]>(query);

    return skins;
  }

  private hexToRgb(hex: string): RgbColor | null {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result
      ? {
          r: parseInt(result[1], 16),
          g: parseInt(result[2], 16),
          b: parseInt(result[3], 16),
        }
      : null;
  }

  async searchSkinsByName(name: string, limit: number = 10): Promise<Skin[]> {
    if (!name || name.trim() === '') {
      return [];
    }

    return this.prisma.skin.findMany({
      where: {
        name: {
          contains: name,
          mode: 'insensitive',
        },
      },
      take: limit,
    });
  }

  async findLoadoutByColor(
    hexColor: string,
  ): Promise<(Skin & { distance: number })[]> {
    const targetRgb = this.hexToRgb(hexColor);
    if (!targetRgb) {
      throw new Error('Invalid HEX color format.');
    }

    const { r, g, b } = targetRgb;
    const query = Prisma.sql`
      WITH "SkinDistances" AS (
        SELECT
          *,
          LEAST(
            sqrt(pow("primaryR" - ${r}, 2) + pow("primaryG" - ${g}, 2) + pow("primaryB" - ${b}, 2)),
            sqrt(pow("secondaryR" - ${r}, 2) + pow("secondaryG" - ${g}, 2) + pow("secondaryB" - ${b}, 2)),
            sqrt(pow("accentR" - ${r}, 2) + pow("accentG" - ${g}, 2) + pow("accentB" - ${b}, 2))
          ) AS distance
        FROM
          "Skin"
        WHERE
          "type" = 'weapon' AND "weapon" IS NOT NULL AND "weapon" != ''
      ),
      "RankedSkins" AS (
        SELECT
          *,
          ROW_NUMBER() OVER(
            PARTITION BY "weapon"
            ORDER BY distance ASC
          ) as rn
        FROM
          "SkinDistances"
      )
      SELECT
        "id", "name", "image", "weapon", "rarity", "type",
        "primaryR", "primaryG", "primaryB",
        "secondaryR", "secondaryG", "secondaryB",
        "accentR", "accentG", "accentB",
        "distance"
      FROM
        "RankedSkins"
      WHERE
        rn = 1
      ORDER BY
        "weapon" ASC;
    `;

    const loadoutSkins =
      await this.prisma.$queryRaw<(Skin & { distance: number })[]>(query);

    return loadoutSkins;
  }
}
