import { module } from './_cat.js';
import { A } from '../../core/registry.js';

module('Extract LSB', 'Reads the least significant bit(s) of each byte and packs them into bytes (basic steganography helper).',
  [A.number('Bits per byte (1-4)', 1, 1, 4), A.select('Bit order', ['MSB first', 'LSB first']), A.number('Skip bytes', 0, 0)],
  (data, n, order, skip) => {
    const bits = [];
    const readOrder = order === 'MSB first' ? Array.from({ length: n }, (_, k) => n - 1 - k) : Array.from({ length: n }, (_, k) => k);
    for (let idx = skip; idx < data.length; idx++) {
      const v = data[idx] & ((1 << n) - 1);
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
