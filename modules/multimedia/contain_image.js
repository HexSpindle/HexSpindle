import { module } from './_cat.js';
import { A } from '../../core/registry.js';
import { loadImage, canvasToPng } from './_img.js';

module('Contain Image', 'Scales an image to fit inside a box, padding with a colour (letterbox).', [A.number('Width', 200, 1), A.number('Height', 200, 1), A.string('Background', '#000000')],
  async (data, w, h, bg) => {
    const { canvas: src, width, height } = await loadImage(data);
    const scale = Math.min(w / width, h / height);
    const dw = Math.round(width * scale), dh = Math.round(height * scale);
    const out = new OffscreenCanvas(w, h);
    const ctx = out.getContext('2d');
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, w, h);
    ctx.drawImage(src, (w - dw) / 2, (h - dh) / 2, dw, dh);
    return canvasToPng(out);
  });
