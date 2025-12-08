import { HttpModule } from '@nestjs/axios';
import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { SteamController } from './steam.controller';
import { SteamService } from './steam.service';

@Module({
  imports: [HttpModule, PrismaModule],
  controllers: [SteamController],
  providers: [SteamService],
})
export class SteamModule {}
