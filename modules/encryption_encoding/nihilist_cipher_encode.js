import { module } from './_cat.js';
import { A } from '../../core/registry.js';
import { nihilistEncode } from './_classical_ciphers.js';

module('Nihilist Cipher Encode', 'Classic Nihilist cipher: plaintext and additive key are converted through the same keyed 5x5 Polybius square (I/J combined), then their two-digit coordinates are added as ordinary integers.',
  [A.string('Polybius square keyword', 'ZEBRAS'), A.string('Additive key', 'RUSSIAN')],
  (t, squareKey, key) => nihilistEncode(t, squareKey, key), { text: true });
