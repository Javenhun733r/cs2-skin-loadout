export type ColorBin =
  | 'histRed'
  | 'histOrange'
  | 'histYellow'
  | 'histGreen'
  | 'histCyan'
  | 'histBlue'
  | 'histPurple'
  | 'histPink'
  | 'histBrown'
  | 'histBlack'
  | 'histGray'
  | 'histWhite';

export type Histogram = Record<ColorBin, number>;
export class SkinDto {
  id: string;
  name: string;
  image: string;
  weapon: string | null;
  rarity: string | null;
  type: string;
  histRed: number;
  dominantHex: string;
  histOrange: number;
  histYellow: number;
  histGreen: number;
  histCyan: number;
  histBlue: number;
  histPurple: number;
  histPink: number;
  histBrown: number;
  histBlack: number;
  histGray: number;
  histWhite: number;
}

export class SkinWithDistanceDto extends SkinDto {
  distance: number;
}

export class SkinResponseDto extends SkinDto {
  distance?: number;
  price?: { min: number; max: number } | null;
}

export class FindByHistogramRepoDto {
  targetVector: Histogram;
  limit: number;
  primaryBins: ColorBin[];
}
export class FindLoadoutRepoDto {
  targetVector: Histogram;
  primaryBins: ColorBin[];
}
