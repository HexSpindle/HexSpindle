import { module } from './_cat.js';
import { loadImage, canvasToPng } from './_img.js';

module('Dither Image', 'Converts an image to 1-bit black and white using Floyd-Steinberg dithering.', [],
  async (data) => {
    const { canvas, ctx, width, height } = await loadImage(data);
    const img = ctx.getImageData(0, 0, width, height);
    const n = width * height;
    const gray = new Float32Array(n);
    for (let p = 0, i = 0; p < n; p++, i += 4) gray[p] = 0.299 * img.data[i] + 0.587 * img.data[i + 1] + 0.114 * img.data[i + 2];
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const p = y * width + x;
        const old = gray[p];
        const nw = old < 128 ? 0 : 255;
        gray[p] = nw;
        const err = old - nw;
        if (x + 1 < width) gray[p + 1] += err * 7 / 16;
        if (y + 1 < height) {
          if (x > 0) gray[p + width - 1] += err * 3 / 16;
          gray[p + width] += err * 5 / 16;
          if (x + 1 < width) gray[p + width + 1] += err * 1 / 16;
        }
      }
    }
    for (let p = 0, i = 0; p < n; p++, i += 4) {
      img.data[i] = img.data[i + 1] = img.data[i + 2] = gray[p];
      img.data[i + 3] = 255;
    }
    ctx.putImageData(img, 0, 0);
    return canvasToPng(canvas);
  });
