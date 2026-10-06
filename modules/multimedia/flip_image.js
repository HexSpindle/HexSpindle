import { module } from './_cat.js';
import { A } from '../../core/registry.js';
import { loadBitmap, bitmapToOutput } from './_img.js';
import { flip } from './_jimp.js';

module('Flip Image', 'Mirrors an image along its X (horizontal) or Y (vertical) axis.',
  [A.select('Axis', ['Horizontal', 'Vertical'])],
  async (data, axis) => bitmapToOutput(flip(await loadBitmap(data), axis === 'Horizontal', axis === 'Vertical'), data));
