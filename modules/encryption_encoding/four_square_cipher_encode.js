import { module } from './_cat.js';
import { A } from '../../core/registry.js';

function square(keyword) {
  const seen = [];
  for (const c of (keyword.toUpperCase().replace(/J/g, 'I') + 'ABCDEFGHIKLMNOPQRSTUVWXYZ')) {
    if (/[A-Z]/.test(c) && !seen.includes(c)) seen.push(c);
  }
  return seen;
}

const PLAIN = [];
for (let r = 0; r < 5; r++) {
  for (let c = 0; c < 5; c++) {
    const n = r * 5 + c;
    PLAIN.push(String.fromCharCode(65 + (n < 9 ? n : n + 1)));
  }
}

module('Four-square Cipher Encode', 'Digraph substitution using two keyed squares and two plain squares (J=I).',
  [A.string('Keyword 1 (top-right square)', 'EXAMPLE'), A.string('Keyword 2 (bottom-left square)', 'KEYWORD')],
  (t, k1, k2) => {
    const sq1 = square(k1), sq2 = square(k2);
    const letters = [...t.toUpperCase().replace(/J/g, 'I')].filter(c => /[A-Z]/.test(c));
    if (letters.length % 2) letters.push('X');
    const out = [];
    for (let i = 0; i < letters.length; i += 2) {
      const a = letters[i], b = letters[i + 1];
      const idxA = PLAIN.indexOf(a), idxB = PLAIN.indexOf(b);
      const ra = Math.floor(idxA / 5), ca = idxA % 5;
      const rb = Math.floor(idxB / 5), cb = idxB % 5;
      out.push(sq1[ra * 5 + cb]);
      out.push(sq2[rb * 5 + ca]);
    }
    return out.join('');
  }, { text: true });

export { square, PLAIN };
