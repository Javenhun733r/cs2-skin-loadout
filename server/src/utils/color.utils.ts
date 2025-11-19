/*eslint-disable */
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

const LIGHTNESS_BLACK = 0.1;
const LIGHTNESS_WHITE = 0.95;
const CHROMA_GRAY = 0.03;

export function safeOklch(
  r: number,
  g: number,
  b: number,
): { l: number; c: number; h: number } | null {
  try {
    const cResult = oklch({ mode: 'rgb', r, g, b });
    if (!cResult) return null;
    const { l, c, h = 0 } = cResult;
    if (typeof l !== 'number' || typeof c !== 'number') return null;
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
  if (a < 30) return null;

  const col = safeOklch(r, g, b);
  if (!col) return 'Gray';

  const { l, c } = col;

  if (l < LIGHTNESS_BLACK) return 'Black';
  if (l > LIGHTNESS_WHITE) return 'White';
  if (c < CHROMA_GRAY) return 'Gray';

  const hue = (col.h || 0) % 360;
  if (hue >= 20 && hue <= 75 && l < 0.55 && c < 0.15) return 'Brown';

  const hueIndex = Math.floor(hue / HUE_BIN_WIDTH) % HUE_BINS;
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
