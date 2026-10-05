import { module } from './_cat.js';
import { A } from '../../core/registry.js';
import { loadImage, canvasToPng } from './_img.js';

module('Cover Image', 'Scales and crops an image so it completely covers a box.', [A.number('Width', 200, 1), A.number('Height', 200, 1)],
  async (data, w, h) => {
    const { canvas: src, width, height } = await loadImage(data);
    const scale = Math.max(w / width, h / height);
    const sw = w / scale, sh = h / scale; // source rectangle (centred) that maps onto the full box
    const sx = (width - sw) / 2, sy = (height - sh) / 2;
    const out = new OffscreenCanvas(w, h);
    out.getContext('2d').drawImage(src, sx, sy, sw, sh, 0, 0, w, h);
    return canvasToPng(out);
  });
