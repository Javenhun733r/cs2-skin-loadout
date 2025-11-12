import { HttpService } from '@nestjs/axios';
import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { firstValueFrom } from 'rxjs';

// 1. Оновлюємо типи, щоб вони відповідали масиву об'єктів
interface PriceItem {
  name: string;
  price: number;
  // (тут можуть бути й інші поля, як 'have', 'max', але нам потрібні лише ці)
}
type PriceCache = PriceItem[]; // Тепер це масив!

@Injectable()
export class PricingService implements OnModuleInit {
  private readonly logger = new Logger(PricingService.name);
  private priceCache: PriceCache = []; // Початковий стан - порожній масив
  private readonly LOOT_FARM_URL = 'https://loot.farm/fullprice.json';

  constructor(private readonly httpService: HttpService) {}

  async onModuleInit() {
    this.logger.log('Running initial price load...');
    await this.fetchAndCachePrices();

    const REFRESH_INTERVAL = 1000 * 60 * 20;

    setInterval(() => {
      this.fetchAndCachePrices().catch((err) => {
        this.logger.error('Unhandled error during scheduled price fetch', err);
      });
    }, REFRESH_INTERVAL);
  }

  private async fetchAndCachePrices() {
    this.logger.log('Updating price cache...');
    try {
      // 2. Очікуємо масив PriceItem[]
      const response = await firstValueFrom(
        this.httpService.get<PriceItem[]>(this.LOOT_FARM_URL),
      );

      if (response.data && Array.isArray(response.data)) {
        this.priceCache = response.data;
        this.logger.log(
          `Price cache successfully updated. Loaded ${
            response.data.length // 3. Використовуємо .length для масиву
          } items.`,
        );
      }
    } catch (error) {
      let errorMessage = 'An unknown error occurred';
      if (error instanceof Error) {
        errorMessage = error.message;
      } else if (typeof error === 'string') {
        errorMessage = error;
      }

      this.logger.error(
        'Failed to load price list from loot.farm',
        errorMessage,
      );
    }
  }

  /**
   * Миттєво отримує МІНІМАЛЬНУ та МАКСИМАЛЬНУ ціну для предмета з кешу
   * @param baseName Базова назва предмета (напр. "AK-47 | Redline")
   * @returns Об'єкт {min, max} або null, якщо не знайдено
   */
  public getPriceByName(baseName: string): { min: number; max: number } | null {
    // 4. Повністю нова логіка пошуку для масиву
    // Фільтруємо масив, шукаючи відповідності
    const matchingItems = this.priceCache.filter((item) =>
      item.name.startsWith(baseName),
    );

    if (matchingItems.length === 0) {
      return null;
    }

    let minPrice = Infinity;
    let maxPrice = 0;

    for (const item of matchingItems) {
      // 5. Просто отримуємо ціну з об'єкта
      const itemPrice = item.price;

      if (itemPrice > 0) {
        if (itemPrice < minPrice) {
          minPrice = itemPrice;
        }
        if (itemPrice > maxPrice) {
          maxPrice = itemPrice;
        }
      }
    }

    if (minPrice === Infinity) {
      return null;
    }

    return { min: minPrice, max: maxPrice };
  }
}
