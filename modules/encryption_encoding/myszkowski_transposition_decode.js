import { module } from './_cat.js';
import { A } from '../../core/registry.js';
import { myszkowskiDecode } from './_classical_ciphers.js';

module('Myszkowski Transposition Decode', 'Reconstructs the Myszkowski grid from the repeated-letter key and reads the restored text row-by-row.',
  [A.string('Keyword', 'TOMATO'), A.boolean('Strip ciphertext whitespace', true)],
  (t, key, strip) => myszkowskiDecode(strip ? String(t).replace(/\s+/g, '') : t, key), { text: true });
