import { module } from './_cat.js';
import { A } from '../../core/registry.js';
import { loadImage, canvasToPng } from './_img.js';

module('Crop Image', 'Crops an image to a rectangle.', [A.number('X', 0, 0), A.number('Y', 0, 0), A.number('Width', 100, 1), A.number('Height', 100, 1)],
  async (data, x, y, w, h) => {
    const { canvas: src } = await loadImage(data);
    const out = new OffscreenCanvas(w, h);
    out.getContext('2d').drawImage(src, x, y, w, h, 0, 0, w, h);
    return canvasToPng(out);
  });
