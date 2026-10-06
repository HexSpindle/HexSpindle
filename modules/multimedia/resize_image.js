import { module } from './_cat.js';
import { A } from '../../core/registry.js';
import { loadBitmap, bitmapToPng } from './_img.js';
import { resize, scaleToFit, RESIZE_MODES } from './_jimp.js';

module('Resize Image',
  'Resizes an image, in pixels or as a percentage of its current size. With "Maintain aspect ratio" ' +
  'the image is scaled to fit inside the given box instead of being stretched to it. The resampling ' +
  'algorithms are the five Jimp implements.',
  [A.number('Width', 100, 1), A.number('Height', 100, 1), A.select('Unit type', ['Pixels', 'Percent']),
   A.boolean('Maintain aspect ratio', false),
   A.select('Resizing algorithm', Object.keys(RESIZE_MODES), 'Bilinear')],
  async (data, w, h, unit, aspect, alg) => {
    const bm = await loadBitmap(data);
    if (unit === 'Percent') { w = bm.width * (w / 100); h = bm.height * (h / 100); }
    return bitmapToPng(aspect ? scaleToFit(bm, w, h, alg) : resize(bm, w, h, alg));
  });
