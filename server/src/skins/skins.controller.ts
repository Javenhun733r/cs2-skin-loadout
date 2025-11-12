import { BadRequestException, Controller, Get, Query } from '@nestjs/common';
import { FindSkinsDto } from './dto/find-skins.dto';
import { SkinsService } from './skins.service';
import { FindLoadoutDto } from './dto/find-loadout.dto';

@Controller('skins')
export class SkinsController {
  constructor(private readonly skinsService: SkinsService) {}

  @Get('similar-to')
  async findSimilarSkins(@Query() query: FindSkinsDto) {
    const hexColor = query.color.startsWith('#')
      ? query.color
      : `#${query.color}`;

    try {
      return this.skinsService.findSkinsByColor(hexColor, query.limit);
    } catch (error) {
      if (error instanceof Error) {
        throw new BadRequestException(error.message);
      }
      throw new BadRequestException('An unknown error occurred.');
    }
  }
  @Get('search')
  async searchSkins(@Query('q') query: string) {
    if (!query) {
      throw new BadRequestException('Missing "q" query parameter.');
    }
    return this.skinsService.searchSkinsByName(query, 10);
  }
  @Get('loadout')
  async findLoadout(@Query() query: FindLoadoutDto) {
    const hexColor = query.color.startsWith('#')
      ? query.color
      : `#${query.color}`;

    try {
      return this.skinsService.findLoadoutByColor(hexColor);
    } catch (error) {
      if (error instanceof Error) {
        throw new BadRequestException(error.message);
      }
      throw new BadRequestException('An unknown error occurred.');
    }
  }
}
