import { module } from './_cat.js';
import { A } from '../../core/registry.js';
import { loadImage, canvasToPng } from './_img.js';

module('Image Filter',
  'Applies a greyscale or sepia filter to an image, using the same pixel formulas as ' +
  "Jimp-based implementation: greyscale uses ITU-R BT.709 luma weights (0.2126/0.7152/" +
  '0.0722), and sepia reproduces Jimp\'s formula exactly, including the fact that it reuses the ' +
  'already-recomputed red channel (rather than the original) when computing the new green and blue ' +
  'channels - a known quirk of that formula, not a textbook sepia matrix.',
  [A.select('Filter type', ['Greyscale', 'Sepia'])],
  async (data, filterType) => {
    const { canvas, ctx, width, height } = await loadImage(data);
    const img = ctx.getImageData(0, 0, width, height);
    const d = img.data;
    for (let i = 0; i < d.length; i += 4) {
      if (filterType === 'Greyscale') {
        const grey = 0.2126 * d[i] + 0.7152 * d[i + 1] + 0.0722 * d[i + 2];
        d[i] = d[i + 1] = d[i + 2] = grey;
      } else {
        let red = d[i], green = d[i + 1], blue = d[i + 2];
        red = red * 0.393 + green * 0.769 + blue * 0.189;
        green = red * 0.349 + green * 0.686 + blue * 0.168;
        blue = red * 0.272 + green * 0.534 + blue * 0.131;
        d[i] = Math.min(255, red);
        d[i + 1] = Math.min(255, green);
        d[i + 2] = Math.min(255, blue);
      }
    }
    ctx.putImageData(img, 0, 0);
    return canvasToPng(canvas);
  });
