import { module } from './_cat.js';
import { A } from '../../core/registry.js';
import { square } from './four_square_cipher_encode.js';

module('Two-square Cipher Decode', 'Decodes a Two-square cipher.',
  [A.string('Keyword 1 (top square)', 'EXAMPLE'), A.string('Keyword 2 (bottom square)', 'KEYWORD')],
  (t, k1, k2) => {
    const sq1 = square(k1), sq2 = square(k2);
    const letters = [...t.toUpperCase().replace(/J/g, 'I')].filter(c => /[A-Z]/.test(c));
    const out = [];
    for (let i = 0; i < letters.length - 1; i += 2) {
      const a = letters[i], b = letters[i + 1];
      const idxA = sq1.indexOf(a), idxB = sq2.indexOf(b);
      const ra = Math.floor(idxA / 5), ca = idxA % 5;
      const rb = Math.floor(idxB / 5), cb = idxB % 5;
      if (ra === rb) {
        out.push(sq1[ra * 5 + cb]);
        out.push(sq2[rb * 5 + ca]);
      } else {
        out.push(sq1[ra * 5 + ca]);
        out.push(sq2[rb * 5 + cb]);
      }
    }
    return out.join('');
  }, { text: true });
