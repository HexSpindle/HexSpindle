import { module } from './_cat.js';
import { A } from '../../core/registry.js';
import { loadImage, canvasToPng } from './_img.js';

const CHANNEL_INDEX = { Red: 0, Green: 1, Blue: 2, Alpha: 3 };

module('View Bit Plane', 'Shows a single bit plane of a colour channel (useful for LSB steganography).',
  [A.select('Colour', ['Red', 'Green', 'Blue', 'Alpha', 'Grey']), A.number('Bit', 0, 0, 7)],
  async (data, colour, bit) => {
    const { canvas, ctx, width, height } = await loadImage(data);
    const img = ctx.getImageData(0, 0, width, height);
    const chan = CHANNEL_INDEX[colour];
    for (let i = 0; i < img.data.length; i += 4) {
      let v;
      if (chan === undefined) v = Math.round(0.299 * img.data[i] + 0.587 * img.data[i + 1] + 0.114 * img.data[i + 2]);
      else v = img.data[i + chan];
      const out = (v >> bit) & 1 ? 255 : 0;
      img.data[i] = img.data[i + 1] = img.data[i + 2] = out;
      img.data[i + 3] = 255;
    }
    ctx.putImageData(img, 0, 0);
    return canvasToPng(canvas);
  });
