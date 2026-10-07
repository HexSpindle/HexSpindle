import { module } from './_cat.js';
import { A } from '../../core/registry.js';
import { fourSquareTransform } from './_classical_ciphers.js';

module('Four-square Cipher Encode', 'Four-square digraph substitution with two keyed ciphertext squares. Supports both common 25-letter conventions: I/J combined or Q omitted.',
  [A.string('Keyword 1 (top-right)', 'EXAMPLE'), A.string('Keyword 2 (bottom-left)', 'KEYWORD'), A.select('25-letter convention', ['I/J combined', 'Omit Q'], 'I/J combined')],
  (t, k1, k2, variant) => fourSquareTransform(t, k1, k2, variant, false), { text: true });
