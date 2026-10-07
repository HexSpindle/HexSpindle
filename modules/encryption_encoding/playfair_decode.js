import { module } from './_cat.js';
import { A } from '../../core/registry.js';
import { playfairTransform } from './_classical_ciphers.js';

module('Playfair Decode', 'Decodes classic Playfair ciphertext. I/J remain combined and filler letters are deliberately left in the plaintext because they cannot be removed unambiguously.',
  [A.string('Keyword', '')],
  (t, key) => playfairTransform(t, key, true), { text: true });
