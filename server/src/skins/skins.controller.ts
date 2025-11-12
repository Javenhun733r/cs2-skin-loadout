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
    try {
      return this.skinsService.findSkinsByColor(query);
    } catch (error) {
      if (error instanceof Error) {
        throw new BadRequestException(error.message);
      }
      throw new BadRequestException('An unknown error occurred.');
    }
  }
  @Get('similar-to-skin/:id')
  async findSimilarSkinsBySkin(
    @Param('id') id: string,
    @Query() query: FindSimilarDto,
  ): Promise<SkinResponseDto[]> {
    try {
      return this.skinsService.findSimilarSkinsBySkinId(id, query);
    } catch (error) {
      if (error instanceof Error) {
        throw new BadRequestException(error.message);
      }
      throw new BadRequestException('An unknown error occurred.');
    }
  }
  @Get('search')
  async searchSkins(@Query('q') query: string): Promise<SkinResponseDto[]> {
    if (!query) {
      throw new BadRequestException('Missing "q" query parameter.');
    }
    return this.skinsService.searchSkinsByName(query, 10);
  }

  @Get('loadout')
  async findLoadout(
    @Query() query: FindLoadoutDto,
  ): Promise<SkinResponseDto[]> {
    try {
      return this.skinsService.findLoadoutByColor(query);
    } catch (error) {
      if (error instanceof Error) {
        throw new BadRequestException(error.message);
      }
      throw new BadRequestException('An unknown error occurred.');
    }
  }
}
