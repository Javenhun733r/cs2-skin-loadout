import { Module } from '@nestjs/common';
import { SkinsModule } from './skins/skins.module';
import { PrismaModule } from './prisma/prisma.module';
import { PricingModule } from './pricing/pricing.module';
import { ScheduleModule } from '@nestjs/schedule';
import { SteamModule } from './steam/steam.module';
@Module({
  imports: [SkinsModule, PrismaModule, PricingModule, ScheduleModule.forRoot(), SteamModule],
})
export class AppModule {}
