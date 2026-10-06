import { module } from './_cat.js';
import { A } from '../../core/registry.js';
import { loadBitmap, bitmapToPng } from './_img.js';
import { cover, RESIZE_MODES } from './_jimp.js';

module('Cover Image',
  'Scales an image so it completely covers a box of the given size, then crops the overflow off ' +
  'according to the alignment.',
  [A.number('Width', 100, 1), A.number('Height', 100, 1),
   A.select('Horizontal align', ['Left', 'Center', 'Right'], 'Center'),
   A.select('Vertical align', ['Top', 'Middle', 'Bottom'], 'Middle'),
   A.select('Resizing algorithm', Object.keys(RESIZE_MODES), 'Bilinear')],
  async (data, w, h, hAlign, vAlign, alg) =>
    bitmapToPng(cover(await loadBitmap(data), w, h, hAlign, vAlign, alg)));
