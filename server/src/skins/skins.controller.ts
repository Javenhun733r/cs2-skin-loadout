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

  @Get('similar-to-color')
  async findSimilarSkins(
    @Query() query: FindSkinsDto,
  ): Promise<SkinResponseDto[]> {
    const skins = await this.skinsService.findSkinsByColor(query);
    return skins;
  }

  @Get('similar-to-skin/:id')
  async findSimilarSkinsBySkin(
    @Param('id') id: string,
    @Query() query: FindSimilarDto,
  ): Promise<SkinResponseDto[]> {
    const skins = await this.skinsService.findSimilarSkinsBySkinId(id, query);
    return skins;
  }

  @Get('search')
  async searchSkins(@Query('q') query: string): Promise<SkinResponseDto[]> {
    if (!query) {
      throw new BadRequestException('Missing "q" query parameter.');
    }
    const skins = await this.skinsService.searchSkinsByName(query, 10);
    return skins;
  }

  @Get('loadout')
  async findLoadout(
    @Query() query: FindLoadoutDto,
  ): Promise<SkinResponseDto[]> {
    const skins = await this.skinsService.findLoadoutByColor(query);
    return skins;
  }
}
