import { Transform, Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsInt,
  IsOptional,
  IsString,
  Matches,
  Max,
  Min,
} from 'class-validator';

const hexColorRegex = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i;

export class FindSkinsDto {
  @IsArray()
  @ArrayMinSize(1, { message: 'At least one color must be provided.' })
  @ArrayMaxSize(3, { message: 'You can search by a maximum of 3 colors.' })
  @Matches(hexColorRegex, {
    each: true,
    message:
      'Invalid "colors" format. Use 6-digit HEX (e.g., FF0000 or #FF0000).',
  })
  @Transform(({ value }) =>
    (typeof value === 'string'
      ? value.split(',')
      : Array.isArray(value)
        ? value
        : ['']
    )
      .map((c: string) =>
        c.startsWith('#') ? c : `#${c.replace(/[^a-fA-F0-9]/g, '')}`,
      )
      .filter(Boolean),
  )
  colors: string[];

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
