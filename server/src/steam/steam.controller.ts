import { Controller, Get, Param } from '@nestjs/common';
import { SteamService } from './steam.service';

@Controller('steam')
export class SteamController {
  constructor(private readonly steamService: SteamService) {}

  @Get('inventory/:steamId')
  async getInventory(@Param('steamId') steamId: string) {
    return this.steamService.getInventory(steamId);
  }
}
