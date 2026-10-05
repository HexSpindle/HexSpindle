import { module } from './_cat.js';
import { A } from '../../core/registry.js';
import { loadImage, canvasToPng } from './_img.js';

module('Image Opacity', 'Sets the opacity of an image (0-100%). Output is PNG.', [A.number('Opacity (%)', 100, 0, 100)],
  async (data, pct) => {
    const { canvas, ctx, width, height } = await loadImage(data);
    const img = ctx.getImageData(0, 0, width, height);
    for (let i = 3; i < img.data.length; i += 4) img.data[i] = Math.floor(img.data[i] * pct / 100);
    ctx.putImageData(img, 0, 0);
    return canvasToPng(canvas);
  });
