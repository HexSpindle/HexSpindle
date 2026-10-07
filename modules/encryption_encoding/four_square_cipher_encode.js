import { module } from './_cat.js';
import { A } from '../../core/registry.js';
import { fourSquareKey, fourSquareTransform } from './_classical_ciphers.js';

// Backward-compatible helper used by the existing Two-square Encode/Decode
// modules. Historically four_square_cipher_encode.js exported `square()`,
// so keep that public export while the Four-square implementation itself
// uses the shared classical-cipher helper.
export function square(keyword = '') {
  return fourSquareKey(keyword, 'I/J combined');
}

module('Four-square Cipher Encode', 'Four-square digraph substitution with two keyed ciphertext squares. Supports both common 25-letter conventions: I/J combined or Q omitted.',
  [A.string('Keyword 1 (top-right)', 'EXAMPLE'), A.string('Keyword 2 (bottom-left)', 'KEYWORD'), A.select('25-letter convention', ['I/J combined', 'Omit Q'], 'I/J combined')],
  (t, k1, k2, variant) => fourSquareTransform(t, k1, k2, variant, false), { text: true });
