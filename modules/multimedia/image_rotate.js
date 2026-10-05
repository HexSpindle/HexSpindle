import { module } from './_cat.js';
import { A } from '../../core/registry.js';
import { loadImage, canvasToPng } from './_img.js';

module('Image Rotate', 'Rotates an image by a multiple of 90 degrees (re-encoded as PNG).', [A.select('Degrees', ['90', '180', '270'])],
  async (data, deg) => {
    const { canvas: src, width, height } = await loadImage(data);
    const swapped = deg !== '180';
    const out = new OffscreenCanvas(swapped ? height : width, swapped ? width : height);
    const ctx = out.getContext('2d');
    ctx.translate(out.width / 2, out.height / 2);
    ctx.rotate((+deg * Math.PI) / 180);
    ctx.drawImage(src, -width / 2, -height / 2);
    return canvasToPng(out);
  });
