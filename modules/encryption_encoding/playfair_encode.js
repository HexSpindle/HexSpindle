import { module } from './_cat.js';
import { A } from '../../core/registry.js';
import { playfairTransform } from './_classical_ciphers.js';

module('Playfair Encode', 'Classic Playfair digraph cipher using a keyed 5x5 square (I/J combined). Repeated letters are split with X; Q is used when X itself needs a separator.',
  [A.string('Keyword', '')],
  (t, key) => playfairTransform(t, key, false), { text: true });
