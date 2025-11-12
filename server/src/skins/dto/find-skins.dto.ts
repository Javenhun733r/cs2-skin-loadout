import { Type } from 'class-transformer';
import {
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Matches,
  Min,
} from 'class-validator';

export class FindSkinsDto {
  @IsString()
  @IsNotEmpty()
  @Matches(/^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i, {
    message:
      'Invalid "color" format. Use 6-digit HEX (e.g., FF0000 or #FF0000).',
  })
  color: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  limit: number = 10;
}
