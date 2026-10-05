import { module } from './_cat.js';
import { A } from '../../core/registry.js';
import { DELIMS, delim } from '../../core/util.js';
import { loadImage } from './_img.js';

module('Extract RGBA', 'Outputs the pixel values of an image as numbers.', [A.select('Delimiter', DELIMS, 'Space'), A.boolean('Include alpha', true)],
  async (data, d, alpha) => {
    const { ctx, width, height } = await loadImage(data);
    const img = ctx.getImageData(0, 0, width, height);
    const sep = delim(d);
    const out = [];
    const step = alpha ? 4 : 3;
    for (let i = 0; i < img.data.length; i += 4) for (let c = 0; c < step; c++) out.push(img.data[i + c]);
    return out.join(sep);
  });
