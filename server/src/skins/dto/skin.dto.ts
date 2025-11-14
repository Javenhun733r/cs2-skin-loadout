export type ColorBin = string; // Тепер будь-який ключ типу 'hist*'

export type Histogram = Record<ColorBin, number>;

export class SkinDto {
  id: string;
  name: string;
  image: string;
  weapon: string | null;
  rarity: string | null;
  type: string;
  dominantHex: string;

  histogram?: string; // JSON рядок з вектором

  // Автоматично динамічні поля hist*, які будуть заповнені parseHistogram
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
