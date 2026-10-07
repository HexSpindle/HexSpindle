import { module } from './_cat.js';
import { A } from '../../core/registry.js';
import { fourSquareTransform } from './_classical_ciphers.js';

module('Four-square Cipher Decode', 'Decodes Four-square ciphertext with the same two keyed squares and 25-letter convention used for encryption.',
  [A.string('Keyword 1 (top-right)', 'EXAMPLE'), A.string('Keyword 2 (bottom-left)', 'KEYWORD'), A.select('25-letter convention', ['I/J combined', 'Omit Q'], 'I/J combined')],
  (t, k1, k2, variant) => fourSquareTransform(t, k1, k2, variant, true), { text: true });
