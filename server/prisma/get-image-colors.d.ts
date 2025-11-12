declare module 'get-image-colors' {
  import type Color from 'color';

  interface GetColorsOptions {
    count?: number;
    type?: string;
  }

  function getColors(
    buffer: Buffer,
    options: GetColorsOptions,
  ): Promise<Color[]>;

  export = getColors;
}
