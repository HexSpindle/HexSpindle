import { module } from './_cat.js';
import { A } from '../../core/registry.js';
import { loadImage, canvasToPng } from './_img.js';

module('Image Resize', 'Resizes an image (re-encoded as PNG).', [A.number('Width', 200, 1), A.number('Height', 200, 1)],
  async (data, w, h) => {
    const { canvas: src } = await loadImage(data);
    const out = new OffscreenCanvas(w, h);
    out.getContext('2d').drawImage(src, 0, 0, w, h);
    return canvasToPng(out);
  });
