/* eslint-disable  */
import { Injectable, NotFoundException } from '@nestjs/common';
import { oklch, type Oklch } from 'culori';
import { PricingService } from '../pricing/pricing.service';
import { FindLoadoutDto } from './dto/find-loadout.dto';
import { FindSimilarDto, FindSkinsDto } from './dto/find-skins.dto';
import { SkinResponseDto, type ColorBin, type Histogram } from './dto/skin.dto';
import { SkinsRepository } from './skins.repository';
const colorNeighbors: Record<ColorBin, ColorBin[]> = {
  histRed: ['histRed', 'histOrange', 'histPink', 'histBrown'],
  histOrange: ['histOrange', 'histRed', 'histBrown', 'histYellow'],
  histYellow: ['histYellow', 'histOrange', 'histGreen'],
  histGreen: ['histGreen', 'histYellow', 'histCyan', 'histBlue'],
  histCyan: ['histCyan', 'histGreen', 'histBlue'],
  histBlue: ['histBlue', 'histCyan', 'histPurple'],
  histPurple: ['histPurple', 'histBlue', 'histPink'],
  histPink: ['histPink', 'histPurple', 'histRed'],
  histBrown: ['histBrown', 'histRed', 'histOrange'],
  histBlack: ['histBlack', 'histGray', 'histBrown'],
  histGray: ['histGray', 'histBlack', 'histWhite'],
  histWhite: ['histWhite', 'histGray'],
};
@Injectable()
export class SkinsService {
  constructor(
    private skinsRepository: SkinsRepository,
    private pricingService: PricingService,
  ) {}
  async findSimilarSkinsBySkinId(
    skinId: string,
    controllerDto: FindSimilarDto,
  ): Promise<SkinResponseDto[]> {
    const targetSkin = await this.skinsRepository.findById(skinId);
    if (!targetSkin) {
      throw new NotFoundException('Target skin not found');
    }

    const targetVector: Histogram = {
      histRed: targetSkin.histRed,
      histOrange: targetSkin.histOrange,
      histYellow: targetSkin.histYellow,
      histGreen: targetSkin.histGreen,
      histCyan: targetSkin.histCyan,
      histBlue: targetSkin.histBlue,
      histPurple: targetSkin.histPurple,
      histPink: targetSkin.histPink,
      histBrown: targetSkin.histBrown,
      histBlack: targetSkin.histBlack,
      histGray: targetSkin.histGray,
      histWhite: targetSkin.histWhite,
    };

    const primaryBins = this.getPrimaryBinsFromVector(targetVector);

    const mode = controllerDto.mode || 'premium';
    const userLimit = controllerDto.limit || 20;
    const searchPoolLimit = mode === 'budget' ? 100 : userLimit;

    const skinsFromRepo = await this.skinsRepository.findByHistogram({
      targetVector,
      primaryBins,
      limit: searchPoolLimit,
    });

    const skinsWithPrices = skinsFromRepo.map((skin) => ({
      ...skin,
      price: this.pricingService.getPriceByName(skin.name),
    }));

    if (mode === 'budget') {
      const getSortScore = (skin: SkinResponseDto): number => {
        const price = skin.price?.min || 5000;
        const distance = 1 - (skin.distance || 0);
        return distance * Math.pow(price, 0.4);
      };
      return skinsWithPrices
        .sort((a, b) => getSortScore(a) - getSortScore(b))
        .slice(0, userLimit);
    }
    return skinsWithPrices.filter((skin) => skin.id !== skinId);
  }
  async findSkinsByColor(
    controllerDto: FindSkinsDto,
  ): Promise<SkinResponseDto[]> {
    const { targetVector, primaryBins } = this.createTargetVector(
      controllerDto.color,
    );
    if (!targetVector) {
      throw new Error('Invalid HEX color format.');
    }

    const mode = controllerDto.mode || 'premium';
    const userLimit = controllerDto.limit || 20;
    const searchPoolLimit = mode === 'budget' ? 100 : userLimit;

    const skinsFromRepo = await this.skinsRepository.findByHistogram({
      targetVector,
      primaryBins,
      limit: searchPoolLimit,
    });

    const skinsWithPrices = skinsFromRepo.map((skin) => ({
      ...skin,
      price: this.pricingService.getPriceByName(skin.name),
    }));

    if (mode === 'budget') {
      const getSortScore = (skin: SkinResponseDto): number => {
        const price = skin.price?.min || 5000;
        const distance = 1 - (skin.distance || 0);
        return distance * Math.pow(price, 0.4);
      };
      return skinsWithPrices
        .sort((a, b) => getSortScore(a) - getSortScore(b))
        .slice(0, userLimit);
    }
    return skinsWithPrices;
  }

  async searchSkinsByName(
    name: string,
    limit: number = 10,
  ): Promise<SkinResponseDto[]> {
    const skinsFromRepo = await this.skinsRepository.findByName(name, limit);
    return skinsFromRepo.map((skin) => ({
      ...skin,
      distance: undefined,
      price: this.pricingService.getPriceByName(skin.name),
    }));
  }

  async findLoadoutByColor(
    controllerDto: FindLoadoutDto,
  ): Promise<SkinResponseDto[]> {
    const { targetVector, primaryBins } = this.createTargetVector(
      controllerDto.color,
    );
    if (!targetVector) {
      throw new Error('Invalid HEX color format.');
    }

    const mode = controllerDto.mode || 'premium';

    const allLoadoutOptions =
      await this.skinsRepository.findAllLoadoutOptionsByColor({
        targetVector,
        primaryBins,
      });
    const skinsWithPrices = allLoadoutOptions.map((skin) => ({
      ...skin,
      price: this.pricingService.getPriceByName(skin.name),
    }));

    const groupedByWeapon = new Map<string, SkinResponseDto[]>();
    for (const skin of skinsWithPrices) {
      if (!skin.weapon) continue;
      const group = groupedByWeapon.get(skin.weapon) || [];
      group.push(skin);
      groupedByWeapon.set(skin.weapon, group);
    }

    const finalLoadout: SkinResponseDto[] = [];
    for (const [, skins] of groupedByWeapon.entries()) {
      let bestSkin: SkinResponseDto | undefined;

      if (mode === 'budget') {
        bestSkin = skins.reduce((best, current) => {
          const bestPrice = best.price?.min || Infinity;
          const currentPrice = current.price?.min || Infinity;
          return currentPrice < bestPrice ? current : best;
        });
      } else {
        bestSkin = skins.reduce((best, current) => {
          return (current.distance || 0) > (best.distance || 0)
            ? current
            : best;
        });
      }
      if (bestSkin) {
        finalLoadout.push(bestSkin);
      }
    }

    return finalLoadout.sort(
      (a, b) => this.getWeaponSortPriority(a) - this.getWeaponSortPriority(b),
    );
  }

  private getWeaponSortPriority(skin: SkinResponseDto): number {
    if (!skin.weapon || !skin.type) return 99;
    if (skin.type === 'knife') return 1;
    if (skin.type === 'glove') return 2;
    const weapon = skin.weapon.toLowerCase();
    const pistols = [
      'glock-18',
      'usp-s',
      'p2000',
      'p250',
      'tec-9',
      'five-seven',
      'cz75-auto',
      'desert eagle',
      'r8 revolver',
      'dual berettas',
    ];
    if (pistols.includes(weapon)) return 3;
    const shotguns = ['nova', 'xm1014', 'mag-7', 'sawed-off'];
    if (shotguns.includes(weapon)) return 4;
    const smgs = [
      'mp9',
      'mac-10',
      'mp7',
      'mp5-sd',
      'ump-45',
      'p90',
      'pp-bizon',
    ];
    if (smgs.includes(weapon)) return 5;
    const rifles = [
      'ak-47',
      'm4a4',
      'm4a1-s',
      'famas',
      'galil ar',
      'aug',
      'sg 553',
    ];
    if (rifles.includes(weapon)) return 6;
    const snipers = ['ssg 08', 'awp', 'scar-20', 'g3sg1'];
    if (snipers.includes(weapon)) return 7;
    const machineGuns = ['negev', 'm249'];
    if (machineGuns.includes(weapon)) return 8;
    return 99;
  }

  private classifyColor(r: number, g: number, b: number): ColorBin {
    const color: Oklch | undefined = oklch({ mode: 'rgb', r, g, b });
    if (!color) return 'histBlack';

    const { l, c, h } = { l: color.l, c: color.c, h: color.h || 0 };

    if (l < 0.15) return 'histBlack';
    if (l > 0.95) return 'histWhite';
    if (c < 0.05) return 'histGray';
    if (h >= 15 && h < 45) return 'histOrange';
    if (h >= 45 && h < 75) return 'histBrown';
    if (h >= 75 && h < 105) return 'histYellow';
    if (h >= 105 && h < 165) return 'histGreen';
    if (h >= 165 && h < 210) return 'histCyan';
    if (h >= 210 && h < 285) return 'histBlue';
    if (h >= 285 && h < 330) return 'histPurple';
    if (h >= 330 && h < 350) return 'histPink';
    return 'histRed';
  }

  private hexToRgb(hex: string): { r: number; g: number; b: number } | null {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(
      hex.replace('#', ''),
    );
    return result
      ? {
          r: parseInt(result[1], 16),
          g: parseInt(result[2], 16),
          b: parseInt(result[3], 16),
        }
      : null;
  }

  private createTargetVector(hex: string): {
    targetVector: Histogram;
    primaryBins: ColorBin[];
  } {
    const vector: Histogram = {
      histRed: 0,
      histOrange: 0,
      histYellow: 0,
      histGreen: 0,
      histCyan: 0,
      histBlue: 0,
      histPurple: 0,
      histPink: 0,
      histBrown: 0,
      histBlack: 0,
      histGray: 0,
      histWhite: 0,
    };
    const rgb = this.hexToRgb(hex);
    if (!rgb) return { targetVector: vector, primaryBins: ['histRed'] };

    const bin = this.classifyColor(rgb.r / 255, rgb.g / 255, rgb.b / 255);
    vector[bin] = 1.0;

    return { targetVector: vector, primaryBins: colorNeighbors[bin] };
  }
  private getPrimaryBinsFromVector(vector: Histogram): ColorBin[] {
    const topBins = Object.entries(vector)
      .filter(
        ([key]) =>
          key !== 'histBlack' && key !== 'histWhite' && key !== 'histGray',
      )
      .sort(([, a], [, b]) => b - a)
      .slice(0, 3)
      .map(([key]) => key as ColorBin);

    if (topBins.length > 0) {
      return topBins;
    }

    return ['histBlack', 'histWhite', 'histGray'];
  }
}
