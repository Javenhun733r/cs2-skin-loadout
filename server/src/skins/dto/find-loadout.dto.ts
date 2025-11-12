import { IsNotEmpty, IsString, Matches } from 'class-validator';

export class FindLoadoutDto {
  @IsString()
  @IsNotEmpty()
  @Matches(/^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i, {
    message:
      'Invalid "color" format. Use 6-digit HEX (e.g., FF0000 or #FF0000).',
  })
  color: string;
}
