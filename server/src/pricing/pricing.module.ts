import { HttpModule } from '@nestjs/axios';
import { Module } from '@nestjs/common';

import { PricingService } from './pricing.service';

@Module({
  imports: [
    HttpModule.register({
      timeout: 10000,
      maxRedirects: 5,
    }),
  ],
  providers: [PricingService],
  exports: [PricingService],
})
export class PricingModule {}
