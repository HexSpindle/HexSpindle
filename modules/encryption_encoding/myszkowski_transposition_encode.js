import { module } from './_cat.js';
import { A } from '../../core/registry.js';
import { myszkowskiEncode } from './_classical_ciphers.js';

module('Myszkowski Transposition Encode', 'Myszkowski transposition: repeated keyword letters share a rank and their columns are read together row-by-row; unique-rank columns are read top-to-bottom.',
  [A.string('Keyword', 'TOMATO'), A.boolean('Strip whitespace', true)],
  (t, key, strip) => myszkowskiEncode(t, key, strip), { text: true });
