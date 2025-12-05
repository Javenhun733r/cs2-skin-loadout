import { Module } from '@nestjs/common';
import { PrismaModule } from 'src/prisma/prisma.module';
import { SkinsController } from './skins.controller';
import { SkinsRepository } from './skins.repository';
import { SkinsService } from './skins.service';

@Module({
  imports: [PrismaModule],
  controllers: [SkinsController],
  providers: [SkinsService, SkinsRepository],
})
export class SkinsModule {}
