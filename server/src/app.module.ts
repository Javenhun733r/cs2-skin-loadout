import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { SkinsModule } from './skins/skins.module';
import { PrismaModule } from './prisma/prisma.module';

@Module({
  imports: [SkinsModule, PrismaModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
