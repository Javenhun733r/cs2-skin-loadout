export type ColorBin = string;

export type Histogram = Record<ColorBin, number>;

export class SkinDto {
  id: string;
  name: string;
  image: string;
  weapon: string | null;
  rarity: string | null;
  type: string;
  dominantHex: string;

  priceMin: number;
  priceMax: number;

  histogram?: string;

  [key: string]: any;
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
}

export class FindLoadoutRepoDto {
  targetVector: Histogram;
  threshold?: number;
}
