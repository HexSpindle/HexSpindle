import { module } from './_cat.js';
import { A } from '../../core/registry.js';
import { loadImage, canvasToPng, boxBlur, gaussianBlur } from './_img.js';

module('Blur Image', 'Applies a Gaussian or box blur.', [A.number('Radius', 5, 0), A.select('Type', ['Gaussian', 'Box'])],
  async (data, radius, kind) => {
    const { canvas, ctx, width, height } = await loadImage(data);
    const img = ctx.getImageData(0, 0, width, height);
    const blurred = kind === 'Gaussian' ? gaussianBlur(img, width, height, radius) : boxBlur(img, width, height, radius);
    ctx.putImageData(blurred, 0, 0);
    return canvasToPng(canvas);
  });
