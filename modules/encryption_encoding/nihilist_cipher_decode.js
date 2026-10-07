import { module } from './_cat.js';
import { A } from '../../core/registry.js';
import { nihilistDecode } from './_classical_ciphers.js';

module('Nihilist Cipher Decode', 'Decodes space- or punctuation-separated Nihilist numbers by subtracting the repeated Polybius-coordinate key and looking up the remaining coordinate.',
  [A.string('Polybius square keyword', 'ZEBRAS'), A.string('Additive key', 'RUSSIAN')],
  (t, squareKey, key) => nihilistDecode(t, squareKey, key), { text: true });
