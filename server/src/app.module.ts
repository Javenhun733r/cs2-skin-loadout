import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { SkinsModule } from './skins/skins.module';
import { PrismaModule } from './prisma/prisma.module';
import { PricingModule } from './pricing/pricing.module';

@Module({
  imports: [SkinsModule, PrismaModule, PricingModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
