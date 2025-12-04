import { Injectable, NotFoundException } from '@nestjs/common';
import { PricingService } from '../pricing/pricing.service';
import {
  BIN_NAMES,
  createTargetVectorFromColors,
  createVectorString,
  TOTAL_BINS,
  type ColorBin as UtilsColorBin,
} from '../utils/color.utils';
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

  constructor(
    private skinsRepository: SkinsRepository,
    private pricingService: PricingService,
  ) {}

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
      const effectivePrice = price === 0 ? 9999999 : price;
      return (distance + 0.1) * Math.pow(effectivePrice, 0.4);
    }

    const priceBonus = Math.pow(Math.log10(price + 1), 2);

    return distance / (1 + priceBonus * 0.5);
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

    const skinsWithPrices: SkinResponseDto[] = skinsFromRepo.map((skin) => ({
      ...this.parseHistogramFromSkin(skin),
      price: this.pricingService.getPriceByName(skin.name),
    }));

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

    const result = skinsFromRepo.map((skin) => ({
      ...this.parseHistogramFromSkin(skin),
      price: this.pricingService.getPriceByName(skin.name),
    }));

    return result;
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
    return skinsFromRepo.map((skin) => ({
      ...this.parseHistogramFromSkin(skin),
      price: this.pricingService.getPriceByName(skin.name),
    }));
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

    const allSkinsWithPrice = skinsFromRepo.map((skin) => ({
      ...this.parseHistogramFromSkin(skin),
      price: this.pricingService.getPriceByName(skin.name),
    }));

    const mode = dto.mode || 'premium';

    const bestSkinsByWeapon = new Map<string, SkinResponseDto>();
    const gloves: SkinResponseDto[] = [];
    const knives: SkinResponseDto[] = [];
    const agents: SkinResponseDto[] = [];

    for (const skin of allSkinsWithPrice) {
      if (skin.type === 'glove') {
        gloves.push(skin);
        continue;
      }
      if (skin.type === 'knife') {
        knives.push(skin);
        continue;
      }
      if (skin.type === 'agent') {
        agents.push(skin);
        continue;
      }

      const weapon = skin.weapon;
      if (!weapon) continue;

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

    const topGloves = gloves
      .sort(
        (a, b) => this.calculateScore(a, mode) - this.calculateScore(b, mode),
      )
      .slice(0, 5);

    const topKnives = knives
      .sort(
        (a, b) => this.calculateScore(a, mode) - this.calculateScore(b, mode),
      )
      .slice(0, 5);

    const topAgents = agents
      .sort(
        (a, b) => this.calculateScore(a, mode) - this.calculateScore(b, mode),
      )
      .slice(0, 5);

    const weaponsList = Array.from(bestSkinsByWeapon.values());

    const result = [
      ...weaponsList,
      ...topGloves,
      ...topKnives,
      ...topAgents,
    ].sort((a, b) => {
      const weaponA = a.weapon?.toLowerCase() || '';
      const weaponB = b.weapon?.toLowerCase() || '';

      const indexA = this.PRIORITY_WEAPONS.indexOf(weaponA);
      const indexB = this.PRIORITY_WEAPONS.indexOf(weaponB);

      const isPriorityA = indexA !== -1;
      const isPriorityB = indexB !== -1;

      if (isPriorityA && isPriorityB) {
        return indexA - indexB;
      }

      if (isPriorityA) return -1;

      if (isPriorityB) return 1;

      return this.calculateScore(a, mode) - this.calculateScore(b, mode);
    });

    return result;
  }
}
