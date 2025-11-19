import { Injectable, NotFoundException } from '@nestjs/common';
import { PricingService } from '../pricing/pricing.service';
import {
  BIN_NAMES,
  CHROMATIC_BIN_NAMES,
  hexToRgb,
  safeOklch,
  TOTAL_BINS,
} from '../utils/color.utils';
import { FindLoadoutDto } from './dto/find-loadout.dto';
import { FindSimilarDto, FindSkinsDto } from './dto/find-skins.dto';
import {
  SkinDto,
  SkinResponseDto,
  type ColorBin,
  type Histogram,
} from './dto/skin.dto';
import { SkinsRepository } from './skins.repository';

const LIGHTNESS_BLACK = 0.15;
const LIGHTNESS_WHITE = 0.95;
const CHROMA_GRAY = 0.03;

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
      const binName = BIN_NAMES[i];
      const key = `hist${i}`;
      const val = (skin as Record<string, unknown>)[key];
      vector[binName] = typeof val === 'number' && !isNaN(val) ? val : 0;
    }
    return vector;
  }

  private sanitizeVector(vector: Histogram): Histogram {
    const safeVector: Histogram = {} as Histogram;
    for (const bin of BIN_NAMES) {
      const val = vector[bin];
      safeVector[bin] = typeof val === 'number' && !isNaN(val) ? val : 0;
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

  async findSkinsByColors(dto: FindSkinsDto): Promise<SkinResponseDto[]> {
    const { targetVector } = this.createTargetVectorFromColors(dto.colors);
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
    const { targetVector } = this.createTargetVectorFromColor(dto.color);
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

  private createTargetVectorFromColor(hex: string): {
    targetVector: Histogram;
    primaryBins: ColorBin[];
  } {
    const vector: Histogram = {} as Histogram;
    BIN_NAMES.forEach((bin) => (vector[bin] = 0));

    const rgb = hexToRgb(hex);
    if (!rgb) {
      return { targetVector: vector, primaryBins: [] };
    }

    const oklchColor = safeOklch(rgb.r / 255, rgb.g / 255, rgb.b / 255);

    if (!oklchColor) return { targetVector: vector, primaryBins: [] };

    if (oklchColor.l < LIGHTNESS_BLACK) {
      vector['Black'] = 0.6;
      vector['Gray'] = 0.4;
      return { targetVector: vector, primaryBins: ['Black'] };
    }
    if (oklchColor.l > LIGHTNESS_WHITE) {
      vector['White'] = 0.6;
      vector['Gray'] = 0.4;
      return { targetVector: vector, primaryBins: ['White'] };
    }
    if (oklchColor.c < CHROMA_GRAY) {
      vector['Gray'] = 1;
      return { targetVector: vector, primaryBins: ['Gray'] };
    }

    const hue = (oklchColor.h ?? 0) % 360;
    if (hue >= 20 && hue <= 75 && oklchColor.l < 0.55 && oklchColor.c < 0.15) {
      vector['Brown'] = 1;
      return { targetVector: vector, primaryBins: ['Brown'] };
    }

    const hueBinCount = CHROMATIC_BIN_NAMES.length;
    const binWidth = 360 / hueBinCount;

    const exactPos = hue / binWidth;
    const bin1Idx = Math.floor(exactPos) % hueBinCount;
    const bin2Idx = (bin1Idx + 1) % hueBinCount;

    const ratio = exactPos - Math.floor(exactPos);

    const bin1Name = CHROMATIC_BIN_NAMES[bin1Idx];
    const bin2Name = CHROMATIC_BIN_NAMES[bin2Idx];

    vector[bin1Name] = 1.0 - ratio;
    vector[bin2Name] = ratio;

    const primaryBins = ratio > 0.5 ? [bin2Name] : [bin1Name];

    return { targetVector: vector, primaryBins };
  }

  private createTargetVectorFromColors(hexColors: string[]): {
    targetVector: Histogram;
    primaryBins: ColorBin[];
  } {
    const vector: Histogram = {} as Histogram;
    BIN_NAMES.forEach((bin) => (vector[bin] = 0));

    let totalWeight = 0;
    const primaryBins = new Set<ColorBin>();

    for (const hex of hexColors) {
      const { targetVector: singleColorVector, primaryBins: singlePrimary } =
        this.createTargetVectorFromColor(hex);

      for (const bin of BIN_NAMES) {
        const weight = singleColorVector[bin];
        if (weight > 0) {
          vector[bin] = (vector[bin] || 0) + weight;
        }
      }

      totalWeight += 1.0;
      singlePrimary.forEach((bin) => primaryBins.add(bin));
    }

    if (totalWeight > 0) {
      for (const bin of BIN_NAMES) {
        vector[bin] = vector[bin] / totalWeight;
      }
    }

    return { targetVector: vector, primaryBins: Array.from(primaryBins) };
  }
}
