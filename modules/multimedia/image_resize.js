import { module } from './_cat.js';
import { A } from '../../core/registry.js';
import { loadBitmap, bitmapToPng } from './_img.js';
import { resize } from './_jimp.js';

module('Image Resize', 'Resizes an image to an exact pixel size with bilinear resampling (re-encoded as PNG). ' +
  'See "Resize Image" for percentage sizing, aspect-ratio preservation and other resampling algorithms.',
  [A.number('Width', 100, 1), A.number('Height', 100, 1)],
  async (data, w, h) => bitmapToPng(resize(await loadBitmap(data), w, h, 'Bilinear')));
