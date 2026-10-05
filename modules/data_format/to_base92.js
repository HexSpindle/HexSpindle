import { module } from './_cat.js';

export const ALPHA = '!' + Array.from({ length: 96 - 35 }, (_, i) => String.fromCharCode(35 + i)).join('')
  + Array.from({ length: 126 - 97 }, (_, i) => String.fromCharCode(97 + i)).join('');

module('To Base92', "Encodes data as Base92 (thenoviceoof variant; empty input gives empty output).", [],
  (data) => {
    if (!data.length) return '';
    let bits = '';
    for (const b of data) bits += b.toString(2).padStart(8, '0');
    const out = [];
    let i = 0;
    while (i + 13 <= bits.length) {
      const n = parseInt(bits.slice(i, i + 13), 2);
      out.push(ALPHA[Math.floor(n / 91)] + ALPHA[n % 91]);
      i += 13;
    }
    const rest = bits.slice(i);
    if (rest) {
      if (rest.length < 7) {
        out.push(ALPHA[parseInt(rest.padEnd(6, '0'), 2)]);
      } else {
        const n = parseInt(rest.padEnd(13, '0'), 2);
        out.push(ALPHA[Math.floor(n / 91)] + ALPHA[n % 91]);
      }
    }
    return out.join('');
  });
