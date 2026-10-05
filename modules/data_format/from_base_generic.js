import { module } from './_cat.js';
import { A } from '../../core/registry.js';
import { baseToBytes } from './_base.js';

module('From Base', 'Decodes data encoded with To Base (an arbitrary base using a custom alphabet).',
  [A.string('Alphabet', '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ')],
  (t, alphabet) => {
    if (new Set(alphabet).size !== alphabet.length || alphabet.length < 2) throw new Error('Alphabet must have at least 2 unique characters');
    return baseToBytes(t.trim(), alphabet);
  }, { text: true });
