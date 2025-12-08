import { HttpService } from '@nestjs/axios';
import {
  BadRequestException,
  ForbiddenException,
  HttpException,
  HttpStatus,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { AxiosError } from 'axios';
import { firstValueFrom, retry, timer } from 'rxjs';
import { PrismaService } from '../prisma/prisma.service';
import { SkinResponseDto } from '../skins/dto/skin.dto';

interface SteamAsset {
  classid: string;
  instanceid: string;
}

interface SteamDescription {
  classid: string;
  instanceid: string;
  market_hash_name: string;
}

interface SteamInventoryResponse {
  assets?: SteamAsset[] | null;
  descriptions?: SteamDescription[] | null;
  success?: boolean;
  total_inventory_count?: number;
}

interface LegacyInventoryResponse {
  success: boolean;
  rgInventory?: Record<string, { classid: string; instanceid: string }>;
  rgDescriptions?: Record<string, { market_hash_name: string }>;
}

@Injectable()
export class SteamService {
  private readonly logger = new Logger(SteamService.name);

  constructor(
    private readonly httpService: HttpService,
    private readonly prisma: PrismaService,
  ) {}

  private cleanSkinName(marketHashName: string): string {
    let name = marketHashName;

    name = name.replace(/^StatTrak™ /, '');
    name = name.replace(/^Souvenir /, '');
    name = name.replace(/^★ /, '');

    name = name.replace(/ \(Factory New\)$/, '');
    name = name.replace(/ \(Minimal Wear\)$/, '');
    name = name.replace(/ \(Field-Tested\)$/, '');
    name = name.replace(/ \(Well-Worn\)$/, '');
    name = name.replace(/ \(Battle-Scarred\)$/, '');

    return name.trim();
  }

  private async resolveSteamId(query: string): Promise<string> {
    let cleanQuery = query.trim();

    if (cleanQuery.includes('steamcommunity.com')) {
      if (cleanQuery.endsWith('/')) {
        cleanQuery = cleanQuery.slice(0, -1);
      }
      const parts = cleanQuery.split('/');
      const lastPart = parts[parts.length - 1];

      if (cleanQuery.includes('/profiles/')) {
        if (/^\d{17}$/.test(lastPart)) {
          return lastPart;
        }
      }

      if (cleanQuery.includes('/id/')) {
        cleanQuery = lastPart;
      }
    }

    if (/^\d{17}$/.test(cleanQuery)) {
      return cleanQuery;
    }

    try {
      const url = `https://steamcommunity.com/id/${cleanQuery}/?xml=1`;
      const { data } = await firstValueFrom(
        this.httpService
          .get<string>(url, {
            headers: {
              'User-Agent':
                'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
            },
            timeout: 5000,
            responseType: 'text',
          })
          .pipe(retry(1)),
      );

      const match = data.match(/<steamID64>(\d+)<\/steamID64>/);
      if (match && match[1]) {
        return match[1];
      }
    } catch (error: unknown) {
      if (error instanceof AxiosError && error.response?.status === 404) {
        throw new NotFoundException(
          `Steam user "${cleanQuery}" not found. Please check for typos.`,
        );
      }
      this.logger.warn(`Failed to resolve vanity URL for ${cleanQuery}`);
    }

    throw new BadRequestException(
      `Could not resolve Steam ID for "${query}". Please check for typos or use the 64-bit ID directly.`,
    );
  }

  private async fetchLegacyInventory(
    steamId: string,
  ): Promise<SkinResponseDto[]> {
    this.logger.log(`Attempting legacy fallback for ${steamId}...`);
    const url = `https://steamcommunity.com/profiles/${steamId}/inventory/json/730/2?l=english`;

    const { data } = await firstValueFrom(
      this.httpService.get<LegacyInventoryResponse>(url, {
        headers: {
          'User-Agent':
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
          Referer: `https://steamcommunity.com/profiles/${steamId}/inventory`,
          'Accept-Language': 'en-US,en;q=0.9',
        },
        timeout: 10000,
      }),
    );

    if (!data.success || !data.rgInventory || !data.rgDescriptions) {
      return [];
    }

    const marketNames = new Set<string>();

    const descMap = new Map<string, { market_hash_name: string }>();
    Object.keys(data.rgDescriptions).forEach((key) => {
      descMap.set(key, data.rgDescriptions![key]);
    });

    Object.values(data.rgInventory).forEach((item) => {
      const key = `${item.classid}_${item.instanceid}`;
      const desc = descMap.get(key) || descMap.get(`${item.classid}_0`);

      if (desc && desc.market_hash_name) {
        marketNames.add(this.cleanSkinName(desc.market_hash_name));
      }
    });

    if (marketNames.size === 0) return [];
    return this.matchSkinsInDb(Array.from(marketNames));
  }

  private async matchSkinsInDb(names: string[]): Promise<SkinResponseDto[]> {
    const skins = await this.prisma.skin.findMany({
      where: { name: { in: names } },
    });

    return skins.map((skin) => ({
      ...skin,
      histogram: undefined,
      price: { min: skin.priceMin, max: skin.priceMax },
    }));
  }

  async getInventory(query: string): Promise<SkinResponseDto[]> {
    const steamId = await this.resolveSteamId(query);

    try {
      const url = `https://www.steamcommunity.com/inventory/${steamId}/730/2?l=english&count=2000`;

      const { data } = await firstValueFrom(
        this.httpService
          .get<SteamInventoryResponse>(url, {
            headers: {
              'User-Agent':
                'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
              'Accept-Language': 'en-US,en;q=0.9',
              Referer: `https://steamcommunity.com/profiles/${steamId}/inventory`,
              Connection: 'keep-alive',
            },
            timeout: 15000,
          })
          .pipe(
            retry({
              count: 2,
              delay: (error, retryCount) => {
                if (error instanceof AxiosError && error.response) {
                  const status = error.response.status;

                  if (status === 400 || status === 403 || status === 404) {
                    throw error;
                  }
                }
                return timer(retryCount * 1000);
              },
            }),
          ),
      );

      if (!data || data.success === false) {
        throw new Error('Steam indicates failure (Private Inventory?)');
      }

      if (!data.assets || !data.descriptions) {
        return [];
      }

      const marketNames = new Set<string>();
      const descMap = new Map<string, SteamDescription>();

      data.descriptions.forEach((desc) => {
        const key = `${desc.classid}_${desc.instanceid}`;
        descMap.set(key, desc);
      });

      data.assets.forEach((asset) => {
        const key = `${asset.classid}_${asset.instanceid}`;
        const desc = descMap.get(key);
        if (desc && desc.market_hash_name) {
          marketNames.add(this.cleanSkinName(desc.market_hash_name));
        }
      });

      if (marketNames.size === 0) return [];
      return this.matchSkinsInDb(Array.from(marketNames));
    } catch (error: unknown) {
      try {
        const legacyResult = await this.fetchLegacyInventory(steamId);
        return legacyResult;
      } catch (legacyError) {
        this.logger.error(
          `Primary and Legacy fetch failed for ${steamId}`,
          legacyError,
        );
      }

      if (error instanceof HttpException) {
        throw error;
      }

      if (error instanceof AxiosError) {
        if (error.response?.status === 403 || error.response?.status === 401) {
          throw new ForbiddenException(
            'Steam Inventory is private (403). Please ensure "Inventory" is set to Public in Steam Privacy Settings.',
          );
        }
        if (error.response?.status === 400) {
          throw new ForbiddenException(
            'Steam refused the request (400). This often happens if the inventory is "Friends Only" or if Steam is having issues. Try toggling Privacy to Private then Public.',
          );
        }
        if (error.response?.status === 429) {
          throw new HttpException(
            'Steam API rate limit exceeded. Please wait a minute and try again.',
            HttpStatus.TOO_MANY_REQUESTS,
          );
        }
      }

      const msg = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`Failed to fetch inventory for ${steamId}: ${msg}`);

      throw new HttpException(
        `Failed to fetch Steam inventory: ${msg}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
}
