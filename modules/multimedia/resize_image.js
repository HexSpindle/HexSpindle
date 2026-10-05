import { module } from './_cat.js';
import { A } from '../../core/registry.js';
import { loadImage, canvasToPng } from './_img.js';

const QUALITY = { Bicubic: 'medium', 'Nearest Neighbour': null, Bilinear: 'low', Lanczos: 'high' };

module('Resize Image', 'Resizes an image.',
  [A.number('Width', 100, 1), A.number('Height', 100, 1), A.select('Unit type', ['Pixels', 'Percent']),
   A.boolean('Maintain aspect ratio', true), A.select('Resampling', ['Bicubic', 'Nearest Neighbour', 'Bilinear', 'Lanczos'])],
  async (data, w, h, unit, aspect, resample) => {
    const { canvas: src, width, height } = await loadImage(data);
    if (unit === 'Percent') { w = Math.trunc((width * w) / 100); h = Math.trunc((height * h) / 100); }
    else if (aspect) { h = Math.max(1, Math.trunc((height * w) / width)); }
    w = Math.max(1, w); h = Math.max(1, h);
    const out = new OffscreenCanvas(w, h);
    const ctx = out.getContext('2d');
    const quality = QUALITY[resample];
    ctx.imageSmoothingEnabled = quality !== null;
    if (quality) ctx.imageSmoothingQuality = quality;
    ctx.drawImage(src, 0, 0, w, h);
    return canvasToPng(out);
  });
