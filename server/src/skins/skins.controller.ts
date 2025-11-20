import {
  BadRequestException,
  Controller,
  Get,
  Param,
  Query,
} from '@nestjs/common';
import { FindLoadoutDto } from './dto/find-loadout.dto';
import { FindSimilarDto, FindSkinsDto } from './dto/find-skins.dto';
import { SkinResponseDto } from './dto/skin.dto';
import { SkinsService } from './skins.service';

@Controller('skins')
export class SkinsController {
  constructor(private readonly skinsService: SkinsService) {}

  @Get('similar-by-colors')
  async findSimilarSkins(
    @Query() query: FindSkinsDto,
    @Query('page') page: number = 1,
  ): Promise<SkinResponseDto[]> {
    const pageNum = Number(page) || 1;
    return this.skinsService.findSkinsByColors(query, pageNum);
  }

  @Get('similar-to-skin/:id')
  async findSimilarSkinsBySkin(
    @Param('id') id: string,
    @Query() query: FindSimilarDto,
    @Query('page') page: number = 1,
  ): Promise<SkinResponseDto[]> {
    const pageNum = Number(page) || 1;
    return this.skinsService.findSimilarSkinsBySkinId(id, query, pageNum);
  }

  @Get('search')
  async searchSkins(
    @Query('q') query: string,
    @Query('page') page: number = 1,
  ): Promise<SkinResponseDto[]> {
    if (!query) {
      throw new BadRequestException('Missing "q" query parameter.');
    }
    const pageNum = Number(page) || 1;
    return this.skinsService.searchSkinsByName(query, 20, pageNum);
  }

  @Get('loadout')
  async findLoadout(
    @Query() query: FindLoadoutDto,
  ): Promise<SkinResponseDto[]> {
    const skins = await this.skinsService.findLoadoutByColor(query);
    return skins;
  }
}
