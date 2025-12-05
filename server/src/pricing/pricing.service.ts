import { HttpService } from '@nestjs/axios';
import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';

import { firstValueFrom } from 'rxjs';
import { PrismaService } from '../prisma/prisma.service';

interface PriceItem {
  name: string;
  price: number;
}

@Injectable()
export class PricingService implements OnModuleInit {
  private readonly logger = new Logger(PricingService.name);
  private readonly LOOT_FARM_URL = 'https://loot.farm/fullprice.json';

  constructor(
    private readonly httpService: HttpService,
    private readonly prisma: PrismaService,
  ) {}

  async onModuleInit() {
    this.logger.log('Initializing Pricing Service...');
    await this.updatePrices();
  }

  @Cron(CronExpression.EVERY_HOUR)
  async handleCron() {
    this.logger.log('Running scheduled price update...');
    await this.updatePrices();
  }

  private async updatePrices() {
    try {
      const response = await firstValueFrom(
        this.httpService.get<PriceItem[]>(this.LOOT_FARM_URL),
      );

      if (!response.data || !Array.isArray(response.data)) {
        this.logger.warn('Invalid data format from pricing API');
        return;
      }

      const prices = response.data;
      this.logger.log(`Fetched ${prices.length} prices. Updating database...`);

      const skins = await this.prisma.skin.findMany({
        select: { id: true, name: true },
      });

      let updatedCount = 0;

      for (const skin of skins) {
        const cleanSkinName = skin.name.replace('★', '').trim();

        const matchingItems = prices.filter((p) =>
          p.name.includes(cleanSkinName),
        );

        if (matchingItems.length === 0) continue;

        let minPrice = Infinity;
        let maxPrice = 0;

        for (const item of matchingItems) {
          const price = item.price;
          if (price > 0) {
            if (price < minPrice) minPrice = price;
            if (price > maxPrice) maxPrice = price;
          }
        }

        if (minPrice === Infinity) minPrice = 0;

        await this.prisma.skin.update({
          where: { id: skin.id },
          data: {
            priceMin: Math.round(minPrice),
            priceMax: Math.round(maxPrice),
            priceUpdatedAt: new Date(),
          },
        });
        updatedCount++;
      }

      this.logger.log(`Successfully updated prices for ${updatedCount} skins.`);
    } catch (error) {
      this.logger.error('Failed to update prices', error);
    }
  }
}
