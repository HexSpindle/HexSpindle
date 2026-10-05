import { module } from './_cat.js';
import { A } from '../../core/registry.js';
import { loadImage, canvasToPng } from './_img.js';

module('Flip Image', 'Mirrors an image horizontally or vertically.', [A.select('Axis', ['Horizontal', 'Vertical'])],
  async (data, axis) => {
    const { canvas: src, width, height } = await loadImage(data);
    const out = new OffscreenCanvas(width, height);
    const ctx = out.getContext('2d');
    if (axis === 'Horizontal') { ctx.translate(width, 0); ctx.scale(-1, 1); }
    else { ctx.translate(0, height); ctx.scale(1, -1); }
    ctx.drawImage(src, 0, 0);
    return canvasToPng(out);
  });
