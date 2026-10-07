import { module } from './_cat.js';
import { A } from '../../core/registry.js';
import { ADFGVX_REFERENCE_SQUARE, adfgvxDecode, adfgxDecode } from './_classical_ciphers.js';

module('ADFGVX Cipher Decode', 'Reverses ADFGVX columnar transposition and 6x6 fractionation. The legacy ADFGX toggle is retained for saved recipes.',
  [A.string('Square key / alphabet', ADFGVX_REFERENCE_SQUARE), A.string('Transposition keyword', 'PRIVACY'), A.boolean('Legacy ADFGX mode', false)],
  (t, squareKey, transKey, legacyAdfgx) => legacyAdfgx ? adfgxDecode(t, squareKey, transKey) : adfgvxDecode(t, squareKey, transKey), { text: true });
