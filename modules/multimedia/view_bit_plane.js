import { module } from './_cat.js';
import { A } from '../../core/registry.js';
import { loadBitmap, bitmapToOutput } from './_img.js';

const CHANNEL_INDEX = { Red: 0, Green: 1, Blue: 2, Alpha: 3 };

module('View Bit Plane',
  'Shows a single bit plane of a colour channel as a black-and-white image (useful for spotting LSB ' +
  'steganography). Bit 0 is the least significant bit. A set bit is drawn black and a clear bit ' +
  'white, the usual convention. "Grey" is a HexSpindle extra: it takes the bit ' +
  'from the pixel\'s luma instead of one channel.',
  [A.select('Colour', ['Red', 'Green', 'Blue', 'Alpha', 'Grey']), A.number('Bit', 0, 0, 7)],
  async (data, colour, bit) => {
    if (bit < 0 || bit > 7) throw new Error('Error: Bit argument must be between 0 and 7');
    const bm = await loadBitmap(data);
    const chan = CHANNEL_INDEX[colour];
    for (let i = 0; i < bm.data.length; i += 4) {
      let v;
      if (chan === undefined) v = Math.round(0.299 * bm.data[i] + 0.587 * bm.data[i + 1] + 0.114 * bm.data[i + 2]);
      else v = bm.data[i + chan];
      const out = (v >> bit) & 1 ? 0 : 255;
      bm.data[i] = bm.data[i + 1] = bm.data[i + 2] = out;
      bm.data[i + 3] = 255;
    }
    return bitmapToOutput(bm, data);
  });
