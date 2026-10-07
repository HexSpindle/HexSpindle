import { module } from './_cat.js';
import { A } from '../../core/registry.js';
import { hillTransform } from './_classical_ciphers.js';

module('Hill Cipher Decode', 'Decodes a Hill cipher with the modular inverse of the key matrix. The determinant must be coprime with 26 and ciphertext length must be a whole number of blocks.',
  [A.number('Matrix size (N)', 2, 2, 5), A.string("Key (N*N integers, e.g. '3 3 2 5')", '3 3 2 5')],
  (t, n, key) => hillTransform(t, n, key, true), { text: true });
