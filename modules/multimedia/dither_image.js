import { module } from './_cat.js';
import { loadBitmap, bitmapToPng } from './_img.js';
import { dither } from './_jimp.js';

module('Dither Image',
  'Applies an ordered (Bayer) dither to an image with the fixed 4x4 RGB565 threshold matrix Jimp ' +
  'uses: each channel is raised by a per-position offset of 1-16 and clamped at 255. Despite the ' +
  'name this does not reduce the image to black and white; it is the dither pass that would be ' +
  'applied before quantising to a 16-bit RGB565 palette.',
  [],
  async (data) => bitmapToPng(dither(await loadBitmap(data))));
