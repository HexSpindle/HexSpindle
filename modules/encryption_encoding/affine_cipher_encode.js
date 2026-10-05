import { module } from './_cat.js';
import { A } from '../../core/registry.js';

module('Affine Cipher Encode', 'Encodes with E(x) = (ax + b) mod 26.', [A.number('a', 5), A.number('b', 8)],
  (t, a, b) => [...t].map(c => {
    if (!/[A-Za-z]/.test(c)) return c;
    const isUpper = c === c.toUpperCase();
    const base = isUpper ? 65 : 97;
    return String.fromCharCode((((a * (c.charCodeAt(0) - base) + b) % 26) + 26) % 26 + base);
  }).join(''), { text: true });
