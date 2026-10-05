import { module } from './_cat.js';
import { loadImage, canvasToPng } from './_img.js';

module('Image Grayscale', 'Converts an image to grayscale (re-encoded as PNG).', [],
  async (data) => {
    const { canvas, ctx, width, height } = await loadImage(data);
    const img = ctx.getImageData(0, 0, width, height);
    for (let i = 0; i < img.data.length; i += 4) {
      const g = 0.299 * img.data[i] + 0.587 * img.data[i + 1] + 0.114 * img.data[i + 2];
      img.data[i] = img.data[i + 1] = img.data[i + 2] = g;
    }
    ctx.putImageData(img, 0, 0);
    return canvasToPng(canvas);
  });
