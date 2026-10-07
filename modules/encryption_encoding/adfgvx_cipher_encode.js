import { module } from './_cat.js';
import { A } from '../../core/registry.js';
import { ADFGVX_REFERENCE_SQUARE, adfgvxEncode, adfgxEncode } from './_classical_ciphers.js';

module('ADFGVX Cipher Encode', 'WWI ADFGVX cipher: a keyed 6x6 A-Z/0-9 square produces A/D/F/G/V/X coordinates, followed by stable keyword columnar transposition. The legacy ADFGX toggle is retained for saved recipes; new recipes should use the separate ADFGX operation.',
  [A.string('Square key / alphabet', ADFGVX_REFERENCE_SQUARE), A.string('Transposition keyword', 'PRIVACY'), A.boolean('Legacy ADFGX mode', false)],
  (t, squareKey, transKey, legacyAdfgx) => legacyAdfgx ? adfgxEncode(t, squareKey, transKey) : adfgvxEncode(t, squareKey, transKey), { text: true });
