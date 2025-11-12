import { Module } from '@nestjs/common';
import { PrismaModule } from 'src/prisma/prisma.module';
import { SkinsController } from './skins.controller';
import { SkinsService } from './skins.service';
@Module({
  imports: [PrismaModule],
  controllers: [SkinsController],
  providers: [SkinsService],
})
export class SkinsModule {}
