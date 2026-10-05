import { module } from './_cat.js';
import { A } from '../../core/registry.js';

module('Swap Endianness', 'Swaps byte order within each word.', [A.select('Word length (bytes)', ['2', '4', '8']), A.boolean('Pad incomplete words', true)],
  (data, wordLen, pad) => {
    const n = +wordLen;
    const bytes = [...data];
    if (pad) while (bytes.length % n) bytes.push(0);
    const out = new Uint8Array(bytes.length);
    for (let i = 0; i + n <= bytes.length; i += n) for (let j = 0; j < n; j++) out[i + j] = bytes[i + n - 1 - j];
    return out;
  });
