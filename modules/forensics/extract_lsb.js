import { module } from './_cat.js';
import { A } from '../../core/registry.js';
import { detect } from '../../core/filetypes.js';
import { loadBitmap } from '../multimedia/_img.js';

const CHANNEL_SETS = {
  R: [0], G: [1], B: [2], A: [3], 'R,G,B': [0, 1, 2], 'R,G,B,A': [0, 1, 2, 3],
};

module('Extract LSB',
  'Reads the least significant bit(s) of each byte and packs them into bytes - the usual way data ' +
  'is hidden in an image. When the input is an image it is decoded first and the bits are taken ' +
  "from the chosen colour channels of each pixel, in row order (the red channel only by " +
  'default). "Raw bytes" instead reads ' +
  'the bits of the file\'s own bytes, which is also what happens for any input that is not an image.',
  [A.number('Bits per byte (1-4)', 1, 1, 4), A.select('Bit order', ['MSB first', 'LSB first']), A.number('Skip bytes', 0, 0),
   A.select('Image channels', ['R', 'G', 'B', 'A', 'R,G,B', 'R,G,B,A', 'Raw bytes (ignore image)'])],
  async (data, n, order, skip, channels) => {
    let bytes = data;
    const isImage = detect(data).some(([, , m]) => m.startsWith('image/'));
    if (isImage && CHANNEL_SETS[channels]) {
      const bm = await loadBitmap(data);
      const sel = CHANNEL_SETS[channels];
      bytes = new Uint8Array((bm.data.length / 4) * sel.length);
      let o = 0;
      for (let i = 0; i < bm.data.length; i += 4) for (const c of sel) bytes[o++] = bm.data[i + c];
    }
    const bits = [];
    const readOrder = order === 'MSB first' ? Array.from({ length: n }, (_, k) => n - 1 - k) : Array.from({ length: n }, (_, k) => k);
    for (let idx = skip; idx < bytes.length; idx++) {
      const v = bytes[idx] & ((1 << n) - 1);
      for (const k of readOrder) bits.push((v >> k) & 1);
    }
    const out = [];
    for (let i = 0; i <= bits.length - 8; i += 8) {
      const chunk = bits.slice(i, i + 8);
      const ordered = order === 'MSB first' ? chunk : chunk.slice().reverse();
      let byte = 0;
      for (const bit of ordered) byte = (byte << 1) | bit;
      out.push(byte);
    }
    return new Uint8Array(out);
  });
