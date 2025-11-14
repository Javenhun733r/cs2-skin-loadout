import { Injectable, NotFoundException } from '@nestjs/common';

import { PricingService } from '../pricing/pricing.service';

import { BIN_NAMES, classifyColor, hexToRgb } from '../utils/color.utils';
import { FindLoadoutDto } from './dto/find-loadout.dto';
import { FindSimilarDto, FindSkinsDto } from './dto/find-skins.dto';
import {
  SkinDto,
  SkinResponseDto,
  type ColorBin,
  type Histogram,
} from './dto/skin.dto';
import { SkinsRepository } from './skins.repository';

const TOTAL_BINS = 64;

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
          (skin as Record<string, number>)[`hist${i}`] =
            typeof value === 'number' && !isNaN(value) ? value : 0;
        });
      } catch {
        for (let i = 0; i < TOTAL_BINS; i++)
          (skin as Record<string, number>)[`hist${i}`] = 0;
      }
    } else {
      for (let i = 0; i < TOTAL_BINS; i++) {
        const val = (skin as Record<string, number>)[`hist${i}`];
        (skin as Record<string, number>)[`hist${i}`] =
          typeof val === 'number' && !isNaN(val) ? val : 0;
      }
    }
    return skin;
  }

  private extractHistogramVector(skin: SkinDto): Histogram {
    const vector: Histogram = {} as Histogram;
    for (let i = 0; i < TOTAL_BINS; i++) {
      const key = `hist${i}`;

      const val = (skin as Record<string, unknown>)[key];

      vector[key] = typeof val === 'number' && !isNaN(val) ? val : 0;
    }
    return vector;
  }

  private sanitizeVector(vector: Histogram): Histogram {
    const safeVector: Histogram = {} as Histogram;
    for (let i = 0; i < TOTAL_BINS; i++) {
      const key = `hist${i}`;

      const val = vector[key];
      safeVector[key] = typeof val === 'number' && !isNaN(val) ? val : 0;
    }
    return safeVector;
  }

  async findSimilarSkinsBySkinId(
    skinId: string,
    dto: FindSimilarDto,
  ): Promise<SkinResponseDto[]> {
    const targetSkin = await this.skinsRepository.findById(skinId);
    if (!targetSkin) throw new NotFoundException('Target skin not found');

    const rawVector = this.extractHistogramVector(targetSkin);
    const targetVector = this.sanitizeVector(rawVector);

    const mode = dto.mode || 'premium';
    const userLimit = dto.limit || 20;
    const searchPoolLimit = mode === 'budget' ? 100 : userLimit;

    const skinsFromRepo = await this.skinsRepository.findByHistogram({
      targetVector,
      limit: searchPoolLimit,
    });

    const skinsWithPrices: SkinResponseDto[] = skinsFromRepo.map((skin) => ({
      ...this.parseHistogramFromSkin(skin),
      price: this.pricingService.getPriceByName(skin.name),
    }));

    if (mode === 'budget') {
      const getSortScore = (skin: SkinResponseDto) => {
        const price = skin.price?.min || 5000;
        const distance = 1 - (skin.distance || 0);
        return distance * Math.pow(price, 0.4);
      };
      return skinsWithPrices
        .sort((a, b) => getSortScore(a) - getSortScore(b))
        .slice(0, userLimit);
    }

    return skinsWithPrices.filter((s) => s.id !== skinId);
  }

  async findSkinsByColor(dto: FindSkinsDto): Promise<SkinResponseDto[]> {
    const { targetVector } = this.createTargetVector(dto.color);
    const sanitizedVector = this.sanitizeVector(targetVector);

    const skinsFromRepo = await this.skinsRepository.findByHistogram({
      targetVector: sanitizedVector,
      limit: dto.limit || 20,
    });

    return skinsFromRepo.map((skin) => ({
      ...this.parseHistogramFromSkin(skin),
      price: this.pricingService.getPriceByName(skin.name),
    }));
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
    const { targetVector } = this.createTargetVector(dto.color);
    const sanitizedVector = this.sanitizeVector(targetVector);

    const skinsFromRepo =
      await this.skinsRepository.findAllLoadoutOptionsByColor({
        targetVector: sanitizedVector,

        threshold: dto.threshold,
      });

    return skinsFromRepo.map((skin) => ({
      ...this.parseHistogramFromSkin(skin),
      price: this.pricingService.getPriceByName(skin.name),
    }));
  }

  private createTargetVector(hex: string): {
    targetVector: Histogram;
    primaryBins: ColorBin[];
  } {
    const vector: Histogram = {} as Histogram;

    for (let i = 0; i < TOTAL_BINS; i++) vector[`hist${i}`] = 0;

    const rgb = hexToRgb(hex);
    if (!rgb) {
      return { targetVector: vector, primaryBins: [] };
    }

    const binName = classifyColor(rgb.r / 255, rgb.g / 255, rgb.b / 255, 255);

    if (!binName) {
      return { targetVector: vector, primaryBins: [] };
    }

    const binIndex = BIN_NAMES.indexOf(binName);

    if (binIndex === -1) {
      return { targetVector: vector, primaryBins: [] };
    }

    const key = `hist${binIndex}`;
    vector[key] = 1;

    return { targetVector: vector, primaryBins: [key] };
  }
}
