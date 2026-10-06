import { module } from './_cat.js';
import { A } from '../../core/registry.js';
import { loadBitmap, bitmapToPng } from './_img.js';
import { color } from './_jimp.js';

module('Image Hue/Saturation/Lightness',
  'Rotates the hue of every pixel by the given number of degrees and adds the given percentages to ' +
  'its HSL saturation and lightness (0 leaves that component untouched). Each adjustment is a ' +
  'separate pass over the image through the same HSL conversion Jimp uses (tinycolor2), so the ' +
  'result matches Jimp pixel for pixel, including its rounding.',
  [A.number('Hue', 0, -360, 360), A.number('Saturation', 0, -100, 100), A.number('Lightness', 0, -100, 100)],
  async (data, hue, saturation, lightness) => {
    const bm = await loadBitmap(data);
    if (hue !== 0) color(bm, [{ apply: 'hue', params: [hue] }]);
    if (saturation !== 0) color(bm, [{ apply: 'saturate', params: [saturation] }]);
    if (lightness !== 0) color(bm, [{ apply: 'lighten', params: [lightness] }]);
    return bitmapToPng(bm);
  });
