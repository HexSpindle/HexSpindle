import { module } from './_cat.js';
import { loadImage, canvasToPng } from './_img.js';

module('Greyscale Image', 'Converts an image to greyscale.', [],
  async (data) => {
    const { canvas, ctx, width, height } = await loadImage(data);
    const img = ctx.getImageData(0, 0, width, height);
    const px = img.data;
    for (let i = 0; i < px.length; i += 4) {
      const l = Math.round(0.299 * px[i] + 0.587 * px[i + 1] + 0.114 * px[i + 2]);
      px[i] = px[i + 1] = px[i + 2] = l;
    }
    ctx.putImageData(img, 0, 0);
    return canvasToPng(canvas);
  });
