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

    const price = skin.price && skin.price.min > 0 ? skin.price.min : 9999999;

    if (mode === 'budget') {
      return (distance + 0.1) * Math.pow(price, 0.4);
    }

    return distance;
  }

  async findSimilarSkinsBySkinId(
    skinId: string,
    dto: FindSimilarDto,
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

    const skinsFromRepo = await this.skinsRepository.findByVector(
      vectorString,
      searchPoolLimit,
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

  async findSkinsByColors(dto: FindSkinsDto): Promise<SkinResponseDto[]> {
    const { targetVector } = createTargetVectorFromColors(dto.colors);
    const vectorString = createVectorString(
      targetVector as unknown as Record<UtilsColorBin, number>,
    );

    const limit = dto.limit || 20;
    const searchLimit = limit * 5;

    const skinsFromRepo = await this.skinsRepository.findByVector(
      vectorString,
      searchLimit,
    );

    const result = skinsFromRepo.map((skin) => ({
      ...this.parseHistogramFromSkin(skin),
      price: this.pricingService.getPriceByName(skin.name),
    }));

    const mode = dto.mode || 'premium';

    return result
      .sort(
        (a, b) => this.calculateScore(a, mode) - this.calculateScore(b, mode),
      )
      .slice(0, limit);
  }

  async searchSkinsByName(
    name: string,
    limit: number,
  ): Promise<SkinResponseDto[]> {
    const skinsFromRepo = await this.skinsRepository.findByName(name, limit);
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
      dto.threshold || 0.85,
    );

    const allSkinsWithPrice = skinsFromRepo.map((skin) => ({
      ...this.parseHistogramFromSkin(skin),
      price: this.pricingService.getPriceByName(skin.name),
    }));

    const mode = dto.mode || 'premium';

    const bestSkinsByWeapon = new Map<string, SkinResponseDto>();

    for (const skin of allSkinsWithPrice) {
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

    return Array.from(bestSkinsByWeapon.values()).sort(
      (a, b) => this.calculateScore(a, mode) - this.calculateScore(b, mode),
    );
  }
}
