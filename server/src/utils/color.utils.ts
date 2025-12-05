/* eslint-disable */
import { converter, oklch } from 'culori';

const toHsl = converter('hsl');

export const TOTAL_BINS = 22;

const HUE_BINS = 18;
const HUE_BIN_WIDTH = 360 / HUE_BINS;

export const CHROMATIC_BIN_NAMES = [
  'Red',
  'Vermilion',
  'Orange',
  'Amber',
  'Yellow',
  'Lime',
  'Green',
  'Mint',
  'Teal',
  'Cyan',
  'SkyBlue',
  'Blue',
  'Indigo',
  'Violet',
  'Purple',
  'Magenta',
  'Fuchsia',
  'Rose',
] as const;

export const PRIMARY_BIN_NAMES = [
  ...CHROMATIC_BIN_NAMES,
  'Brown',
  'Black',
  'Gray',
  'White',
] as const;

export type ColorBin = (typeof PRIMARY_BIN_NAMES)[number];

export const BIN_NAMES: ColorBin[] = [...PRIMARY_BIN_NAMES];

export const LIGHTNESS_BLACK = 0.28;
export const LIGHTNESS_WHITE = 0.8;
export const CHROMA_GRAY = 0.03;

export function safeOklch(
  r: number,
  g: number,
  b: number,
): { l: number; c: number; h: number } | null {
  try {
    const cResult = oklch({ mode: 'rgb', r, g, b } as any) as any;
    if (!cResult) return null;

    const l = cResult.l as number;
    const c = cResult.c as number;
    const hRaw = cResult.h as number | undefined;

    if (typeof l !== 'number' || isNaN(l) || typeof c !== 'number' || isNaN(c))
      return null;

    const h = typeof hRaw === 'number' && !isNaN(hRaw) ? hRaw : 0;
    return { l, c, h };
  } catch {
    return null;
  }
}

export function classifyColor(
  r: number,
  g: number,
  b: number,
  a: number,
): Partial<Record<ColorBin, number>> {
  if (a < 100) return {};

  const col = safeOklch(r, g, b);
  if (!col) return { Gray: 1 };

  const { l, c } = col;

  const hueOklch = col.h || 0;
  const isCreamy = hueOklch >= 60 && hueOklch <= 110;
  const whiteChromaLimit = isCreamy ? 0.12 : 0.05;

  if (l > 0.82 && c < whiteChromaLimit) {
    return { White: 1 };
  }

  if (l < 0.02) return { Black: 1 };

  let isColored = false;

  if (l < 0.25) {
    const saturation = c / l;
    if (saturation > 0.15) isColored = true;
  } else {
    if (c >= 0.03) isColored = true;
  }

  if (isColored) {
    const hslCol = toHsl({ mode: 'rgb', r: r / 255, g: g / 255, b: b / 255 });
    const hue = (hslCol?.h || 0) % 360;

    if (hue >= 15 && hue <= 60 && (l < 0.4 || c < 0.1)) {
      return { Brown: 1 };
    }
    if (hue > 60 && hue < 100 && (l < 0.35 || c < 0.1)) {
      return { Brown: 1 };
    }

    const hueBinCount = CHROMATIC_BIN_NAMES.length;
    const shiftedHue = (hue + HUE_BIN_WIDTH / 2) % 360;
    const exactPos = shiftedHue / HUE_BIN_WIDTH;

    const bin1Idx = Math.floor(exactPos) % hueBinCount;
    const bin2Idx = (bin1Idx + 1) % hueBinCount;
    const ratio = exactPos - Math.floor(exactPos);

    const bin1Name = CHROMATIC_BIN_NAMES[bin1Idx];
    const bin2Name = CHROMATIC_BIN_NAMES[bin2Idx];

    return {
      [bin1Name]: 1.0 - ratio,
      [bin2Name]: ratio,
    };
  }

  if (l < LIGHTNESS_BLACK) return { Black: 1 };
  if (l > LIGHTNESS_WHITE) return { White: 1 };

  return { Gray: 1 };
}

export function hexToRgb(
  hex: string,
): { r: number; g: number; b: number } | null {
  const m = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);

  if (!m) return null;
  return {
    r: parseInt(m[1], 16),
    g: parseInt(m[2], 16),
    b: parseInt(m[3], 16),
  };
}

export function histogramToVector(
  histogram: Record<ColorBin, number>,
): number[] {
  const vector = BIN_NAMES.map((bin) => histogram[bin] || 0);
  const sum = vector.reduce((a, b) => a + b, 0) || 1;
  return vector.map((v) => v / sum);
}

export function createVectorString(
  histogram: Record<ColorBin, number>,
): string {
  const vector = histogramToVector(histogram);
  return `[${vector.join(',')}]`;
}

export function createTargetVectorFromColor(hex: string): {
  targetVector: Record<ColorBin, number>;
  primaryBins: ColorBin[];
} {
  const vector = {} as Record<ColorBin, number>;
  BIN_NAMES.forEach((bin) => (vector[bin] = 0));

  const rgb = hexToRgb(hex);
  if (!rgb) {
    return { targetVector: vector, primaryBins: [] };
  }

  const distribution = classifyColor(rgb.r, rgb.g, rgb.b, 255);

  if (distribution['Black'] && distribution['Black'] > 0.8) {
    distribution['Black'] = 0.5;
    distribution['Gray'] = (distribution['Gray'] || 0) + 0.5;
  }

  const primaryBins: ColorBin[] = [];
  let maxWeight = 0;

  for (const [binName, weight] of Object.entries(distribution)) {
    const bin = binName as ColorBin;
    if (typeof weight === 'number' && weight > 0) {
      vector[bin] = weight;
      if (weight > maxWeight) maxWeight = weight;
    }
  }

  for (const [binName, weight] of Object.entries(distribution)) {
    const bin = binName as ColorBin;
    if (typeof weight === 'number' && weight >= maxWeight * 0.5) {
      primaryBins.push(bin);
    }
  }

  return { targetVector: vector, primaryBins };
}

export function createTargetVectorFromColors(hexColors: string[]): {
  targetVector: Record<ColorBin, number>;
  primaryBins: ColorBin[];
} {
  const vector = {} as Record<ColorBin, number>;
  BIN_NAMES.forEach((bin) => (vector[bin] = 0));

  let totalWeight = 0;
  const primaryBins = new Set<ColorBin>();

  for (const hex of hexColors) {
    const { targetVector: singleColorVector, primaryBins: singlePrimary } =
      createTargetVectorFromColor(hex);

    for (const bin of BIN_NAMES) {
      const weight = singleColorVector[bin];
      if (weight > 0) {
        vector[bin] = (vector[bin] || 0) + weight;
      }
    }

    totalWeight += 1.0;
    singlePrimary.forEach((bin) => primaryBins.add(bin));
  }

  if (totalWeight > 0) {
    for (const bin of BIN_NAMES) {
      vector[bin] = vector[bin] / totalWeight;
    }
  }

  return { targetVector: vector, primaryBins: Array.from(primaryBins) };
}
