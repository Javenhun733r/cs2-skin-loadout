import { Type } from 'class-transformer';
import {
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Matches,
  Max,
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
  @IsOptional()
  @IsString()
  mode?: 'premium' | 'budget' = 'premium';
}
export class FindSimilarDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit: number = 20;

  @IsOptional()
  @IsString()
  mode?: 'premium' | 'budget' = 'premium';
}
