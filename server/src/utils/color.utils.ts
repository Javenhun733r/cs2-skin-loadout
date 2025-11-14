/* eslint-disable */
import { oklch, type Oklch } from 'culori';

export const TOTAL_BINS = 64;

export const BIN_NAMES = [
  'Red',
  'RedPink',
  'Pink',
  'Magenta',
  'Purple',
  'Indigo',
  'Blue',
  'CyanBlue',
  'Cyan',
  'CyanGreen',
  'Green',
  'YellowGreen',
  'Yellow',
  'Orange',
  'RedDark',
  'Brown1',
  'Brown2',
  'GrayDark',
  'Gray',
  'GrayLight',
  'Black',
  'White',
  'Other1',
  'Other2',

  ...Array.from({ length: TOTAL_BINS - 24 }, (_, i) => `Other${i + 3}`),
] as const;

export type ColorBin = (typeof BIN_NAMES)[number];

function safeOklch(
  r: number,
  g: number,
  b: number,
): { l: number; c: number; h: number } | null {
  try {
    const result: Oklch | undefined = oklch({ mode: 'rgb', r, g, b });

    if (!result) return null;

    const l = result.l,
      c = result.c,
      h = result.h || 0;

    if (
      typeof l !== 'number' ||
      isNaN(l) ||
      typeof c !== 'number' ||
      isNaN(c) ||
      typeof h !== 'number' ||
      isNaN(h)
    ) {
      return null;
    }
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
  if (a < 230) return null;

  const color = safeOklch(r, g, b);
  if (!color) return 'Black';

  const { l, c, h } = color;

  if (l < 0.1) return 'Black';
  if (l > 0.95) return 'White';

  if (c < 0.05) {
    if (l < 0.3) return 'GrayDark';
    if (l > 0.8) return 'GrayLight';
    return 'Gray';
  }

  const hueSector = Math.floor(h / (360 / TOTAL_BINS)) % TOTAL_BINS;

  return BIN_NAMES[hueSector] || BIN_NAMES[0];
}

export function hexToRgb(
  hex: string,
): { r: number; g: number; b: number } | null {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(
    hex.replace('#', ''),
  );
  return result
    ? {
        r: parseInt(result[1], 16),
        g: parseInt(result[2], 16),
        b: parseInt(result[3], 16),
      }
    : null;
}
