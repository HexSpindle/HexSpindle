import { module } from './_cat.js';
import { A } from '../../core/registry.js';
import { loadBitmap, bitmapToOutput } from './_img.js';
import { crop, autocrop } from './_jimp.js';

module('Crop Image',
  'Crops an image to the given rectangle, or - with Autocrop on - trims away a uniform border ' +
  'automatically. Autocrop compares every edge pixel with the top-left one and crops the rows and ' +
  'columns that match within the tolerance (a percentage of the maximum colour distance). "Only ' +
  'autocrop frames" requires all four sides to be croppable, "Symmetric autocrop" crops opposite ' +
  'sides by the same amount, and "keep border" leaves that many pixels of the border in place.',
  [A.number('X Position', 0, 0), A.number('Y Position', 0, 0), A.number('Width', 10, 1), A.number('Height', 10, 1),
   A.boolean('Autocrop', false), A.number('Autocrop tolerance (%)', 0.02, 0, 100, 0.01),
   A.boolean('Only autocrop frames', true), A.boolean('Symmetric autocrop', false),
   A.number('Autocrop keep border (px)', 0, 0)],
  async (data, x, y, w, h, auto, tolerance, onlyFrames, symmetric, keepBorder) => {
    const bm = await loadBitmap(data);
    if (auto) autocrop(bm, { tolerance: tolerance / 100, cropOnlyFrames: onlyFrames, cropSymmetric: symmetric, leaveBorder: keepBorder });
    else crop(bm, x, y, w, h);
    return bitmapToOutput(bm, data);
  });
