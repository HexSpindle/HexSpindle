import { module } from './_cat.js';
import { A } from '../../core/registry.js';
import { loadBitmap, bitmapToOutput } from './_img.js';
import { blur, gaussian } from './_jimp.js';

module('Blur Image',
  'Blurs an image. "Fast" is the two-pass "Superfast Blur" box approximation Jimp uses (much ' +
  'quicker, and the default); "Gaussian" is a true Gaussian convolution with a ' +
  'radius of 2.57x the amount, which is far slower but smoother.',
  [A.number('Amount', 5, 1), A.select('Type', ['Fast', 'Gaussian'])],
  async (data, amount, kind) => {
    const bm = await loadBitmap(data);
    return bitmapToOutput(kind === 'Fast' ? blur(bm, amount) : gaussian(bm, amount), data);
  });
