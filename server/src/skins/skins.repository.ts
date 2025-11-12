import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import {
  FindByHistogramRepoDto,
  FindLoadoutRepoDto,
  SkinDto,
  SkinWithDistanceDto,
} from './dto/skin.dto';

@Injectable()
export class SkinsRepository {
  constructor(private prisma: PrismaService) {}

  async findById(id: string): Promise<SkinDto | null> {
    return this.prisma.skin.findUnique({
      where: { id },
      select: {
        id: true,
        name: true,
        image: true,
        weapon: true,
        rarity: true,
        type: true,
        dominantHex: true,
        histRed: true,
        histOrange: true,
        histYellow: true,
        histGreen: true,
        histCyan: true,
        histBlue: true,
        histPurple: true,
        histPink: true,
        histBrown: true,
        histBlack: true,
        histGray: true,
        histWhite: true,
      },
    });
  }

  async findByHistogram(
    dto: FindByHistogramRepoDto,
  ): Promise<SkinWithDistanceDto[]> {
    const { targetVector, limit, primaryBins } = dto;

    const dotProductSql = Object.keys(targetVector)
      .map((key) => `("${key}" * ${targetVector[key]})`)
      .join(' + ');

    const whereOrClauses = primaryBins.map(
      (bin) => Prisma.sql`"${Prisma.raw(bin)}" > 0.1`,
    );
    const whereSql = Prisma.join(whereOrClauses, ' OR ');

    const query = Prisma.sql`
      SELECT
        *,
        (${Prisma.raw(dotProductSql)}) AS distance
      FROM
        "Skin"
      WHERE
        (${whereSql}) 
      ORDER BY
        distance DESC 
      LIMIT
        ${limit};
    `;

    return this.prisma.$queryRaw<SkinWithDistanceDto[]>(query);
  }

  async findAllLoadoutOptionsByColor(
    dto: FindLoadoutRepoDto,
  ): Promise<SkinWithDistanceDto[]> {
    const { targetVector, primaryBins } = dto;

    const dotProductSql = Object.keys(targetVector)
      .map((key) => `("${key}" * ${targetVector[key]})`)
      .join(' + ');

    const whereOrClauses = primaryBins.map(
      (bin) => Prisma.sql`"${Prisma.raw(bin)}" > 0.1`,
    );
    const whereSql = Prisma.join(whereOrClauses, ' OR ');

    const query = Prisma.sql`
      SELECT
        *,
        (${Prisma.raw(dotProductSql)}) AS distance
      FROM
        "Skin"
      WHERE
        ("type" = 'weapon' OR "type" = 'knife' OR "type" = 'glove') 
        AND "weapon" IS NOT NULL AND "weapon" != ''
        AND (${whereSql}) 
      ORDER BY
        distance DESC
      LIMIT 1000; 
    `;

    return this.prisma.$queryRaw<SkinWithDistanceDto[]>(query);
  }
  async findByName(name: string, limit: number): Promise<SkinDto[]> {
    return this.prisma.skin.findMany({
      where: {
        name: {
          contains: name,
          mode: 'insensitive',
        },
      },
      take: limit,
      select: {
        id: true,
        name: true,
        image: true,
        weapon: true,
        rarity: true,
        type: true,
        dominantHex: true,
        histRed: true,
        histOrange: true,
        histYellow: true,
        histGreen: true,
        histCyan: true,
        histBlue: true,
        histPurple: true,
        histPink: true,
        histBrown: true,
        histBlack: true,
        histGray: true,
        histWhite: true,
      },
    });
  }
}
