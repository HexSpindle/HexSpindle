import { module } from './_cat.js';
import { A } from '../../core/registry.js';
import { ADFGX_REFERENCE_SQUARE, adfgxEncode } from './_classical_ciphers.js';

module('ADFGX Cipher Encode', 'WWI ADFGX cipher: a keyed 5x5 Polybius square (I/J combined) produces A/D/F/G/X coordinates, followed by stable keyword columnar transposition.',
  [A.string('Square key / 25-symbol alphabet', ADFGX_REFERENCE_SQUARE), A.string('Transposition keyword', 'CARGO')],
  (t, squareKey, transKey) => adfgxEncode(t, squareKey, transKey), { text: true });
