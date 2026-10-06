import { module } from './_cat.js';
import { A } from '../../core/registry.js';
import { loadBitmap, bitmapToOutput } from './_img.js';
import { brightness, contrast, color } from './_jimp.js';

module('Image Brightness / Contrast',
  'Adjusts an image\'s brightness and contrast, on a -100 to 100 scale, where 0 ' +
  'leaves the channel untouched. Note what Jimp actually does with ' +
  'brightness: it MULTIPLIES every channel by brightness/100, so 100 is unchanged, 50 halves every ' +
  'value and a negative value clamps the image to black - it is not an additive brightness offset. ' +
  'Contrast scales each channel around 127 by (v+1)/(1-v) with v = contrast/100. The third argument ' +
  'is a HexSpindle extra: a relative saturation (1.0 = unchanged) applied afterwards.',
  [A.number('Brightness', 0, -100, 100), A.number('Contrast', 0, -100, 100), A.number('Saturation', 1.0, 0, 5, 0.1)],
  async (data, b, c, s) => {
    const bm = await loadBitmap(data);
    if (b !== 0) brightness(bm, b / 100);
    if (c !== 0) contrast(bm, c / 100);
    if (s !== 1) color(bm, [{ apply: 'saturate', params: [(s - 1) * 100] }]);
    return bitmapToOutput(bm, data);
  });
