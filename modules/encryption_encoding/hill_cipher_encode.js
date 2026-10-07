import { module } from './_cat.js';
import { A } from '../../core/registry.js';
import { hillTransform } from './_classical_ciphers.js';

module('Hill Cipher Encode', 'Hill polygraphic substitution: C = K·P mod 26 using column vectors. The key matrix must be invertible modulo 26; plaintext is padded with X to a full block.',
  [A.number('Matrix size (N)', 2, 2, 5), A.string("Key (N*N integers, e.g. '3 3 2 5')", '3 3 2 5')],
  (t, n, key) => hillTransform(t, n, key, false), { text: true });
