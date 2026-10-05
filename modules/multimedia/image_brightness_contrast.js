import { module } from './_cat.js';
import { A } from '../../core/registry.js';
import { loadImage, canvasToPng } from './_img.js';

const clamp = v => v < 0 ? 0 : v > 255 ? 255 : v;
const luma = (r, g, b) => 0.299 * r + 0.587 * g + 0.114 * b;

module('Image Brightness / Contrast', 'Adjusts brightness, contrast and colour saturation (1.0 = unchanged).',
  [A.number('Brightness', 1.0, 0, 5, 0.1), A.number('Contrast', 1.0, 0, 5, 0.1), A.number('Saturation', 1.0, 0, 5, 0.1)],
  async (data, b, c, s) => {
    const { canvas, ctx, width, height } = await loadImage(data);
    const img = ctx.getImageData(0, 0, width, height);
    const n = img.data.length;

    for (let i = 0; i < n; i += 4) for (let k = 0; k < 3; k++) img.data[i + k] = clamp(Math.round(img.data[i + k] * b));

    let sum = 0, pixels = n / 4;
    for (let i = 0; i < n; i += 4) sum += luma(img.data[i], img.data[i + 1], img.data[i + 2]);
    const mean = Math.round(sum / pixels);
    for (let i = 0; i < n; i += 4) for (let k = 0; k < 3; k++) img.data[i + k] = clamp(Math.round(mean * (1 - c) + img.data[i + k] * c));

    for (let i = 0; i < n; i += 4) {
      const gray = luma(img.data[i], img.data[i + 1], img.data[i + 2]);
      for (let k = 0; k < 3; k++) img.data[i + k] = clamp(Math.round(gray * (1 - s) + img.data[i + k] * s));
    }

    ctx.putImageData(img, 0, 0);
    return canvasToPng(canvas);
  });
