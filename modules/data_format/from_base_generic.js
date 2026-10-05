import { module } from './_cat.js';
import { A } from '../../core/registry.js';
import { baseToBytes } from './_base.js';
import { fromRadix } from './_radix.js';

module('From Base', 'Decodes data encoded with To Base (an arbitrary base using a custom alphabet). Set Radix (2-36) instead to convert a number in that radix to decimal.',
  [A.string('Alphabet', '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ'), A.number('Radix', 0, 0, 36)],
  (t, alphabet, radix = 0) => {
    if (radix) return fromRadix(t, Number(radix));
    if (new Set(alphabet).size !== alphabet.length || alphabet.length < 2) throw new Error('Alphabet must have at least 2 unique characters');
    return baseToBytes(t.trim(), alphabet);
  }, { text: true });
