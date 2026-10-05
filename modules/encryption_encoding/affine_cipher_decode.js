import { module } from './_cat.js';
import { A } from '../../core/registry.js';

function modInverse(a, m) {
  a = ((a % m) + m) % m;
  for (let x = 1; x < m; x++) if ((a * x) % m === 1) return x;
  throw new Error(`'a' (${a}) has no modular inverse mod ${m} - pick a coprime value`);
}

module('Affine Cipher Decode', 'Decodes a message encoded with Affine Cipher Encode.', [A.number('a', 5), A.number('b', 8)],
  (t, a, b) => {
    const aInv = modInverse(a, 26);
    return [...t].map(c => {
      if (!/[A-Za-z]/.test(c)) return c;
      const isUpper = c === c.toUpperCase();
      const base = isUpper ? 65 : 97;
      const y = c.charCodeAt(0) - base;
      return String.fromCharCode((((aInv * (y - b)) % 26) + 26) % 26 + base);
    }).join('');
  }, { text: true });
