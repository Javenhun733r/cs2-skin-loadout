import { Injectable, NotFoundException } from '@nestjs/common';
import {
  BIN_NAMES,
  createTargetVectorFromColors,
  createVectorString,
  TOTAL_BINS,
  type ColorBin as UtilsColorBin,
} from '../utils/color.utils';
import { SCORE_CONFIG } from '../utils/constants';
import { FindLoadoutDto } from './dto/find-loadout.dto';
import { FindSimilarDto, FindSkinsDto } from './dto/find-skins.dto';
import { SkinDto, SkinResponseDto, type Histogram } from './dto/skin.dto';
import { SkinsRepository } from './skins.repository';

@Injectable()
export class SkinsService {
  private readonly PRIORITY_WEAPONS = [
    'usp-s',
    'p2000',
    'glock-18',
    'desert eagle',
    'galil ar',
    'famas',
    'ak-47',
    'm4a4',
    'm4a1-s',
    'ssg 08',
    'awp',
    'mp9',
    'mac-10',
  ];

  constructor(private skinsRepository: SkinsRepository) {}

  private mapSkinToResponse(skin: SkinDto): SkinResponseDto {
    const mapped = this.parseHistogramFromSkin(skin);
    return {
      ...mapped,
      price: { min: skin.priceMin, max: skin.priceMax },
    };
  }

  private parseHistogramFromSkin(skin: SkinDto): SkinDto {
    if (typeof skin.histogram === 'string') {
      try {
        const parsed: unknown[] = JSON.parse(skin.histogram) as unknown[];
        parsed.forEach((value, i) => {
          const binName = BIN_NAMES[i];
          if (binName) {
            (skin as Record<string, number>)[`hist${binName}`] =
              typeof value === 'number' && !isNaN(value) ? value : 0;
          }
        });
      } catch {
        BIN_NAMES.forEach((bin) => {
          (skin as Record<string, number>)[`hist${bin}`] = 0;
        });
      }
    }
    return skin;
  }

  private extractHistogramVector(skin: SkinDto): Histogram {
    const vector: Histogram = {} as Histogram;
    for (let i = 0; i < TOTAL_BINS; i++) {
      const binName = BIN_NAMES[i];
      let val = (skin as Record<string, unknown>)[`hist${binName}`];
      if (val === undefined) {
        val = (skin as Record<string, unknown>)[`hist${i}`];
      }
      vector[binName] = typeof val === 'number' && !isNaN(val) ? val : 0;
    }
    return vector;
  }

  private calculateScore(
    skin: SkinResponseDto,
    mode: 'premium' | 'budget',
  ): number {
    const distance = skin.distance || 1;
    const price = skin.price && skin.price.min > 0 ? skin.price.min : 0;

    if (mode === 'budget') {
      const effectivePrice =
        price === 0 ? SCORE_CONFIG.BUDGET.NO_PRICE_PENALTY : price;

      return (
        (distance + SCORE_CONFIG.BUDGET.DISTANCE_OFFSET) *
        Math.pow(effectivePrice, SCORE_CONFIG.BUDGET.PRICE_EXPONENT)
      );
    }

    const priceBonus = Math.pow(
      Math.log10(price + SCORE_CONFIG.PREMIUM.LOG_OFFSET),
      SCORE_CONFIG.PREMIUM.PRICE_BONUS_EXPONENT,
    );

    return distance / (1 + priceBonus * SCORE_CONFIG.PREMIUM.PRICE_WEIGHT);
  }

  async findSimilarSkinsBySkinId(
    skinId: string,
    dto: FindSimilarDto,
    page: number = 1,
  ): Promise<SkinResponseDto[]> {
    const targetSkin = await this.skinsRepository.findById(skinId);
    if (!targetSkin) throw new NotFoundException('Target skin not found');

    const parsedTarget = this.parseHistogramFromSkin(targetSkin);
    const rawVector = this.extractHistogramVector(parsedTarget);

    const vectorString = createVectorString(
      rawVector as unknown as Record<UtilsColorBin, number>,
    );

    const mode = dto.mode || 'premium';
    const requestedLimit = dto.limit || 20;
    const searchPoolLimit = requestedLimit * 5;
    const offset = (page - 1) * searchPoolLimit;

    const skinsFromRepo = await this.skinsRepository.findByVector(
      vectorString,
      searchPoolLimit,
      offset,
    );

    const skinsWithPrices: SkinResponseDto[] = skinsFromRepo.map((skin) =>
      this.mapSkinToResponse(skin),
    );

    return skinsWithPrices
      .filter((s) => s.id !== skinId)
      .sort(
        (a, b) => this.calculateScore(a, mode) - this.calculateScore(b, mode),
      )
      .slice(0, requestedLimit);
  }

  async findSkinsByColors(
    dto: FindSkinsDto,
    page: number = 1,
  ): Promise<SkinResponseDto[]> {
    const { targetVector } = createTargetVectorFromColors(dto.colors);
    const vectorString = createVectorString(
      targetVector as unknown as Record<UtilsColorBin, number>,
    );

    const limit = dto.limit || 20;
    const offset = (page - 1) * limit;

    const skinsFromRepo = await this.skinsRepository.findByVector(
      vectorString,
      limit,
      offset,
    );

    return skinsFromRepo.map((skin) => this.mapSkinToResponse(skin));
  }

  async searchSkinsByName(
    name: string,
    limit: number,
    page: number = 1,
  ): Promise<SkinResponseDto[]> {
    const offset = (page - 1) * limit;
    const skinsFromRepo = await this.skinsRepository.findByName(
      name,
      limit,
      offset,
    );
    return skinsFromRepo.map((skin) => this.mapSkinToResponse(skin));
  }

  async findLoadoutByColor(dto: FindLoadoutDto): Promise<SkinResponseDto[]> {
    const { targetVector } = createTargetVectorFromColors(dto.colors);
    const vectorString = createVectorString(
      targetVector as unknown as Record<UtilsColorBin, number>,
    );

    const skinsFromRepo = await this.skinsRepository.findAllLoadoutOptions(
      vectorString,
      dto.threshold || 0.9,
    );

    const allSkinsWithPrice = skinsFromRepo.map((skin) =>
      this.mapSkinToResponse(skin),
    );

    const mode = dto.mode || 'premium';
    const lockedIds = new Set(dto.lockedIds || []);
    const maxBudgetCents = dto.maxBudget ? dto.maxBudget * 100 : Infinity;

    const lockedSkins: SkinResponseDto[] = [];
    let currentSpent = 0;

    const lockedWeapons = new Set<string>();
    let hasLockedKnife = false;
    let hasLockedGlove = false;
    let hasLockedAgent = false;

    if (lockedIds.size > 0) {
      for (const skin of allSkinsWithPrice) {
        if (lockedIds.has(skin.id)) {
          lockedSkins.push(skin);
          currentSpent += skin.price?.min || 0;

          if (skin.type === 'knife') hasLockedKnife = true;
          else if (skin.type === 'glove') hasLockedGlove = true;
          else if (skin.type === 'agent') hasLockedAgent = true;
          else if (skin.weapon) lockedWeapons.add(skin.weapon);
        }
      }
    }

    let remainingBudget = maxBudgetCents - currentSpent;
    if (remainingBudget < 0) remainingBudget = 0;

    const resultSkins: SkinResponseDto[] = [...lockedSkins];

    const bestSkinsByWeapon = new Map<string, SkinResponseDto>();
    const gloves: SkinResponseDto[] = [];
    const knives: SkinResponseDto[] = [];
    const agents: SkinResponseDto[] = [];

    const affordableSkins = allSkinsWithPrice.filter((skin) => {
      if (lockedIds.has(skin.id)) return false;

      const price = skin.price?.min || 0;
      return price <= remainingBudget;
    });

    for (const skin of affordableSkins) {
      if (skin.type === 'glove') {
        if (!hasLockedGlove) gloves.push(skin);
        continue;
      }
      if (skin.type === 'knife') {
        if (!hasLockedKnife) knives.push(skin);
        continue;
      }
      if (skin.type === 'agent') {
        if (!hasLockedAgent) agents.push(skin);
        continue;
      }

      const weapon = skin.weapon;
      if (!weapon || lockedWeapons.has(weapon)) continue;

      const currentBest = bestSkinsByWeapon.get(weapon);

      if (!currentBest) {
        bestSkinsByWeapon.set(weapon, skin);
      } else {
        const scoreCurrent = this.calculateScore(skin, mode);
        const scoreBest = this.calculateScore(currentBest, mode);

        if (scoreCurrent < scoreBest) {
          bestSkinsByWeapon.set(weapon, skin);
        }
      }
    }

    if (!hasLockedGlove) {
      const topGloves = gloves
        .sort(
          (a, b) => this.calculateScore(a, mode) - this.calculateScore(b, mode),
        )
        .slice(0, 5);

      resultSkins.push(...topGloves);
    }

    if (!hasLockedKnife) {
      const topKnives = knives
        .sort(
          (a, b) => this.calculateScore(a, mode) - this.calculateScore(b, mode),
        )
        .slice(0, 5);
      resultSkins.push(...topKnives);
    }

    if (!hasLockedAgent) {
      const topAgents = agents
        .sort(
          (a, b) => this.calculateScore(a, mode) - this.calculateScore(b, mode),
        )
        .slice(0, 5);
      resultSkins.push(...topAgents);
    }

    const weaponsList = Array.from(bestSkinsByWeapon.values());
    resultSkins.push(...weaponsList);

    return resultSkins.sort((a, b) => {
      const weaponA = a.weapon?.toLowerCase() || '';
      const weaponB = b.weapon?.toLowerCase() || '';

      const indexA = this.PRIORITY_WEAPONS.indexOf(weaponA);
      const indexB = this.PRIORITY_WEAPONS.indexOf(weaponB);

      const isPriorityA = indexA !== -1;
      const isPriorityB = indexB !== -1;

      if (isPriorityA && isPriorityB) return indexA - indexB;
      if (isPriorityA) return -1;
      if (isPriorityB) return 1;

      return this.calculateScore(a, mode) - this.calculateScore(b, mode);
    });
  }
}
