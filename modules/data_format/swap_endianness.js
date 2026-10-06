import { module } from './_cat.js';
import { A } from '../../core/registry.js';
import { decodeUtf8OrChars, encodeUtf8 } from '../../core/util.js';

function fromHexAuto(text) {
  const out = [];
  for (const part of text.split(/[^a-f\d]|0x/gi)) {
    for (let j = 0; j < part.length; j += 2) out.push(parseInt(part.substr(j, 2), 16));
  }
  return out;
}

function strToByteArray(str) {
  const out = new Array(str.length);
  let i = str.length;
  while (i--) {
    const b = str.charCodeAt(i);
    out[i] = b;
    if (b > 255) return [...encodeUtf8(str)];
  }
  return out;
}

module('Swap Endianness', 'Swaps byte order within each word. Data is read, and returned, in the chosen format.',
  [A.number('Word length (bytes)', 4, 1), A.boolean('Pad incomplete words', true), A.select('Data format', ['Hex', 'Raw'])],
  (data, wordLen, pad, fmt) => {
    const n = +wordLen;
    if (n <= 0) throw new Error('Word length must be greater than 0');
    const text = decodeUtf8OrChars(data);
    const bytes = fmt === 'Raw' ? strToByteArray(text) : fromHexAuto(text);
    const result = [];
    for (let i = 0; i < bytes.length; i += n) {
      const word = bytes.slice(i, i + n);
      if (pad) while (word.length < n) word.push(0);
      for (let j = word.length - 1; j >= 0; j--) result.push(word[j]);
    }
    if (fmt === 'Raw') return Uint8Array.from(result);
    return result.map(b => b.toString(16).padStart(2, '0')).join(' ');
  });
