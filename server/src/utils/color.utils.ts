/* eslint-disable */
import { oklch } from 'culori';

export const TOTAL_BINS = 64;

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
];

export const PRIMARY_BIN_NAMES = [
  ...CHROMATIC_BIN_NAMES,
  'Brown',
  'Black',
  'Gray',
  'White',
] as const;

export type ColorBin = (typeof PRIMARY_BIN_NAMES)[number] | `Other${number}`;

export const BIN_NAMES: ColorBin[] = [
  ...PRIMARY_BIN_NAMES,
  ...Array.from(
    { length: TOTAL_BINS - PRIMARY_BIN_NAMES.length },
    (_, i) => `Other${i + 1}` as ColorBin,
  ),
];

const LIGHTNESS_BLACK = 0.12;
const LIGHTNESS_WHITE = 0.97;
const CHROMA_GRAY = 0.025;

export function safeOklch(
  r: number,
  g: number,
  b: number,
): { l: number; c: number; h: number } | null {
  try {
    const cResult = oklch({ mode: 'rgb', r, g, b });
    if (!cResult) return null;
    const { l, c, h } = cResult;
    if (![l, c, h].every((v) => typeof v === 'number' && isFinite(v)))
      return null;
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
): ColorBin | null {
  if (a < 30) return null;

  const col = safeOklch(r, g, b);
  if (!col) return 'Gray';

  const { l, c } = col;
  if (l < LIGHTNESS_BLACK) return 'Black';
  if (l > LIGHTNESS_WHITE) return 'White';
  if (c < CHROMA_GRAY) return 'Gray';

  const hue = (col.h || 0) % 360;
  if (hue >= 20 && hue <= 75 && l < 0.55 && c < 0.1) return 'Brown';

  const hueIndex = Math.floor(hue / HUE_BIN_WIDTH) % HUE_BINS;
  return CHROMATIC_BIN_NAMES[hueIndex] || 'Red';
}

export function hexToRgb(
  hex: string,
): { r: number; g: number; b: number } | null {
  const m = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  if (!m) return null;
  return {
    r: parseInt(m[1], 16) / 255,
    g: parseInt(m[2], 16) / 255,
    b: parseInt(m[3], 16) / 255,
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
  if (vector.length !== TOTAL_BINS)
    throw new Error(`Histogram vector must have ${TOTAL_BINS} bins`);
  return `[${vector.join(',')}]`;
}
