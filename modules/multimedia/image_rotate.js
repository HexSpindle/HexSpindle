import { module } from './_cat.js';
import { A } from '../../core/registry.js';
import { loadBitmap, bitmapToOutput } from './_img.js';
import { matrixRotate } from './_jimp.js';

module('Image Rotate',
  'Rotates an image anti-clockwise by a multiple of 90 degrees (re-encoded as PNG). This is a pure ' +
  'pixel permutation, so nothing is resampled or lost. See "Rotate Image" for arbitrary angles.',
  [A.select('Degrees', ['90', '180', '270'])],
  async (data, deg) => bitmapToOutput(matrixRotate(await loadBitmap(data), +deg), data));
