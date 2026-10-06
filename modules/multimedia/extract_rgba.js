import { module } from './_cat.js';
import { A } from '../../core/registry.js';
import { DELIMS, delim } from '../../core/util.js';
import { loadBitmap } from './_img.js';

module('Extract RGBA', 'Outputs the raw pixel values of an image as numbers, four per pixel (or three with ' +
  'alpha excluded), in row order. Sometimes used to hide data in an image.',
  [A.select('Delimiter', DELIMS, 'Comma'), A.boolean('Include alpha', true)],
  async (data, d, alpha) => {
    const bm = await loadBitmap(data);
    const sep = delim(d);
    const out = [];
    const step = alpha ? 4 : 3;
    for (let i = 0; i < bm.data.length; i += 4) for (let c = 0; c < step; c++) out.push(bm.data[i + c]);
    return out.join(sep);
  });
