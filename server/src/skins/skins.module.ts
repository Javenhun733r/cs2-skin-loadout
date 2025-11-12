import { Module } from '@nestjs/common';
import { PrismaModule } from 'src/prisma/prisma.module';
import { SkinsController } from './skins.controller';
import { SkinsService } from './skins.service';
import { PricingModule } from 'src/pricing/pricing.module';
@Module({
  imports: [PrismaModule, PricingModule],
  controllers: [SkinsController],
  providers: [SkinsService],
})
export class SkinsModule {}
