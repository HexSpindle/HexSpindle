import { module } from './_cat.js';
import { loadBitmap, bitmapToOutput } from './_img.js';
import { invert } from './_jimp.js';

module('Invert Image', 'Inverts the colours of an image (each of R, G and B becomes 255 minus itself; alpha is left alone).', [],
  async (data) => bitmapToOutput(invert(await loadBitmap(data)), data));
