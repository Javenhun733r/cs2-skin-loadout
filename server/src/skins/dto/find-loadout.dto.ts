import { Transform } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsInt,
  IsOptional,
  IsString,
  Matches,
  Min,
} from 'class-validator';

const hexColorRegex = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i;

export class FindLoadoutDto {
  @IsArray()
  @ArrayMinSize(1, { message: 'At least one color must be provided.' })
  @ArrayMaxSize(3, { message: 'You can use a maximum of 3 colors.' })
  @Matches(hexColorRegex, {
    each: true,
    message:
      'Invalid "colors" format. Use 6-digit HEX (e.g., FF0000 or #FF0000).',
  })
  @Transform(({ value }: { value: unknown }) => {
    if (typeof value === 'string') {
      return value
        .split(',')
        .map((c) => (c.startsWith('#') ? c : `#${c}`))
        .filter(Boolean);
    }

    if (Array.isArray(value)) {
      return value as string[];
    }
    return [];
  })
  colors: string[];

  @IsOptional()
  @IsString()
  mode?: 'premium' | 'budget' = 'premium';

  @IsOptional()
  @Transform(({ value }: { value: unknown }) => parseInt(String(value), 10))
  @IsInt()
  @Min(1)
  limit?: number = 20;

  @IsOptional()
  @Transform(({ value }: { value: unknown }) => parseFloat(String(value)))
  @Min(0)
  threshold?: number;
}
