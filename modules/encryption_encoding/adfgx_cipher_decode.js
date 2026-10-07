import { module } from './_cat.js';
import { A } from '../../core/registry.js';
import { ADFGX_REFERENCE_SQUARE, adfgxDecode } from './_classical_ciphers.js';

module('ADFGX Cipher Decode', 'Reverses ADFGX columnar transposition and 5x5 fractionation.',
  [A.string('Square key / 25-symbol alphabet', ADFGX_REFERENCE_SQUARE), A.string('Transposition keyword', 'CARGO')],
  (t, squareKey, transKey) => adfgxDecode(t, squareKey, transKey), { text: true });
