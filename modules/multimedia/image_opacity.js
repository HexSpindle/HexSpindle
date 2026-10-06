import { module } from './_cat.js';
import { A } from '../../core/registry.js';
import { loadBitmap, bitmapToOutput } from './_img.js';
import { opacity } from './_jimp.js';

module('Image Opacity', 'Scales the alpha channel of an image by the given percentage. Output is PNG.',
  [A.number('Opacity (%)', 100, 0, 100)],
  async (data, pct) => bitmapToOutput(opacity(await loadBitmap(data), pct / 100), data));
