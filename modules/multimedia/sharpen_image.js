import { module } from './_cat.js';
import { A } from '../../core/registry.js';
import { loadBitmap, bitmapToPng } from './_img.js';
import { gaussian, cloneBitmap } from './_jimp.js';

module('Sharpen Image',
  'Sharpens an image with an unsharp mask: a Gaussian blur of the given radius is subtracted from ' +
  'the original to make the mask, the mask is scaled by Amount and added back, and a pixel is only ' +
  'changed when the mask differs from the original by at least Threshold percent of luminance.',
  [A.number('Radius', 2, 1), A.number('Amount', 1, 0, 100, 0.1), A.number('Threshold', 10, 0, 100)],
  async (data, radius, amount, threshold) => {
    const image = await loadBitmap(data);
    const blurMask = cloneBitmap(image);
    const blurImage = gaussian(cloneBitmap(image), radius);
    for (let idx = 0; idx < blurMask.data.length; idx += 4) {
      for (let c = 0; c < 3; c++) {
        const b = blurImage.data[idx + c], n = blurMask.data[idx + c];
        blurMask.data[idx + c] = n > b ? n - b : 0;
      }
    }
    for (let idx = 0; idx < image.data.length; idx += 4) {
      const maskRgb = [blurMask.data[idx], blurMask.data[idx + 1], blurMask.data[idx + 2]];
      const normal = [image.data[idx], image.data[idx + 1], image.data[idx + 2]];
      const lum = ([r, g, b]) => 0.2126 * r + 0.7152 * g + 0.0722 * b;
      const maskLuminance = lum(maskRgb), normalLuminance = lum(normal);
      const luminanceDiff = maskLuminance > normalLuminance
        ? maskLuminance - normalLuminance : normalLuminance - maskLuminance;
      if ((luminanceDiff / 255) * 100 >= threshold) {
        for (let c = 0; c < 3; c++) {
          const v = normal[c] + maskRgb[c] * amount;
          image.data[idx + c] = v <= 255 ? v : 255;
        }
      }
    }
    return bitmapToPng(image);
  });
