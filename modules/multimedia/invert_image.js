import { module } from './_cat.js';
import { loadImage, canvasToPng } from './_img.js';

module('Invert Image', 'Inverts the colours of an image.', [],
  async (data) => {
    const { canvas, ctx, width, height } = await loadImage(data);
    const img = ctx.getImageData(0, 0, width, height);
    for (let i = 0; i < img.data.length; i += 4) {
      img.data[i] = 255 - img.data[i];
      img.data[i + 1] = 255 - img.data[i + 1];
      img.data[i + 2] = 255 - img.data[i + 2];
    }
    ctx.putImageData(img, 0, 0);
    return canvasToPng(canvas);
  });
