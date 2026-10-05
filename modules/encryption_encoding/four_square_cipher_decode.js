import { module } from './_cat.js';
import { A } from '../../core/registry.js';
import { square, PLAIN } from './four_square_cipher_encode.js';

module('Four-square Cipher Decode', 'Decodes a Four-square cipher.',
  [A.string('Keyword 1 (top-right square)', 'EXAMPLE'), A.string('Keyword 2 (bottom-left square)', 'KEYWORD')],
  (t, k1, k2) => {
    const sq1 = square(k1), sq2 = square(k2);
    const letters = [...t.toUpperCase().replace(/J/g, 'I')].filter(c => /[A-Z]/.test(c));
    const out = [];
    for (let i = 0; i < letters.length - 1; i += 2) {
      const a = letters[i], b = letters[i + 1];
      const idxA = sq1.indexOf(a), idxB = sq2.indexOf(b);
      const ra = Math.floor(idxA / 5), cb = idxA % 5;
      const rb = Math.floor(idxB / 5), ca = idxB % 5;
      out.push(PLAIN[ra * 5 + ca]);
      out.push(PLAIN[rb * 5 + cb]);
    }
    return out.join('');
  }, { text: true });
