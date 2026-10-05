import { module } from './_cat.js';
import { A } from '../../core/registry.js';
import { loadImage, canvasToPng, gaussianBlur } from './_img.js';

module('Sharpen Image', 'Sharpens an image with an unsharp mask.', [A.number('Radius', 2, 0), A.number('Amount (%)', 150, 0, 500), A.number('Threshold', 3, 0, 255)],
  async (data, radius, amount, thr) => {
    const { canvas, ctx, width, height } = await loadImage(data);
    const img = ctx.getImageData(0, 0, width, height);
    const blurred = gaussianBlur(img, width, height, radius);
    const out = ctx.createImageData(width, height);
    for (let i = 0; i < img.data.length; i += 4) {
      for (let c = 0; c < 3; c++) {
        const diff = img.data[i + c] - blurred.data[i + c];
        out.data[i + c] = Math.abs(diff) >= thr ? img.data[i + c] + diff * (amount / 100) : img.data[i + c];
      }
      out.data[i + 3] = img.data[i + 3];
    }
    ctx.putImageData(out, 0, 0);
    return canvasToPng(canvas);
  });
