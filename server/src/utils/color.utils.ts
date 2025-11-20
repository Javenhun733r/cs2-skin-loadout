/* eslint-disable */
import { oklch } from 'culori';

export const TOTAL_BINS = 16;

const HUE_BINS = 12;
const HUE_BIN_WIDTH = 360 / HUE_BINS;

export const CHROMATIC_BIN_NAMES = [
  'Red',
  'Orange',
  'Yellow',
  'YellowGreen',
  'Green',
  'CyanGreen',
  'Cyan',
  'CyanBlue',
  'Blue',
  'Indigo',
  'Purple',
  'Magenta',
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

export const LIGHTNESS_BLACK = 0.2;
export const LIGHTNESS_WHITE = 0.8;
export const CHROMA_GRAY = 0.08;

export function safeOklch(
  r: number,
  g: number,
  b: number,
): { l: number; c: number; h: number } | null {
  try {
    const cResult = oklch({ mode: 'rgb', r, g, b });
    if (!cResult) return null;
    const { l, c, h = 0 } = cResult;

    if (typeof l !== 'number' || isNaN(l) || typeof c !== 'number' || isNaN(c))
      return null;
    return { l, c, h: isNaN(h) ? 0 : h };
  } catch {
    return null;
  }
}

export function classifyColor(
  r: number,
  g: number,
  b: number,
  a: number,
): ColorBin | null {
  if (a < 100) return null;

  const col = safeOklch(r, g, b);
  if (!col) return 'Gray';

  const { l, c } = col;

  if (l < LIGHTNESS_BLACK) return 'Black';
  if (l > LIGHTNESS_WHITE) return 'White';

  if (c < CHROMA_GRAY) return 'Gray';

  const hue = (col.h || 0) % 360;

  if (hue >= 15 && hue <= 90 && l < 0.65 && c < 0.2) {
    return 'Brown';
  }

  const shiftedHue = (hue + HUE_BIN_WIDTH / 2) % 360;
  const hueIndex = Math.floor(shiftedHue / HUE_BIN_WIDTH) % HUE_BINS;
  return CHROMATIC_BIN_NAMES[hueIndex] || 'Red';
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

  const oklchColor = safeOklch(rgb.r / 255, rgb.g / 255, rgb.b / 255);
  if (!oklchColor) return { targetVector: vector, primaryBins: [] };

  if (oklchColor.l < LIGHTNESS_BLACK) {
    vector['Black'] = 0.6;
    vector['Gray'] = 0.4;
    return { targetVector: vector, primaryBins: ['Black'] };
  }
  if (oklchColor.l > LIGHTNESS_WHITE) {
    vector['White'] = 0.6;
    vector['Gray'] = 0.4;
    return { targetVector: vector, primaryBins: ['White'] };
  }
  if (oklchColor.c < CHROMA_GRAY) {
    vector['Gray'] = 1;
    return { targetVector: vector, primaryBins: ['Gray'] };
  }

  const hue = (oklchColor.h ?? 0) % 360;
  if (hue >= 15 && hue <= 90 && oklchColor.l < 0.65 && oklchColor.c < 0.2) {
    vector['Brown'] = 1;
    return { targetVector: vector, primaryBins: ['Brown'] };
  }

  const hueBinCount = CHROMATIC_BIN_NAMES.length;
  const binWidth = 360 / hueBinCount;

  const exactPos = hue / binWidth;
  const bin1Idx = Math.floor(exactPos) % hueBinCount;
  const bin2Idx = (bin1Idx + 1) % hueBinCount;

  const ratio = exactPos - Math.floor(exactPos);

  const bin1Name = CHROMATIC_BIN_NAMES[bin1Idx];
  const bin2Name = CHROMATIC_BIN_NAMES[bin2Idx];

  vector[bin1Name] = 1.0 - ratio;
  vector[bin2Name] = ratio;

  const primaryBins = ratio > 0.5 ? [bin2Name] : [bin1Name];

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
