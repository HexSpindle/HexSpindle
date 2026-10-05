import { module } from './_cat.js';
import { A } from '../../core/registry.js';
import { bytesToBase } from './_base.js';

module('To Base', "Encodes data as an arbitrary base using a custom alphabet (e.g. base-36, or any custom symbol set) - the generic version of To Base58/62/85/92.",
  [A.string('Alphabet', '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ')],
  (data, alphabet) => {
    if (new Set(alphabet).size !== alphabet.length || alphabet.length < 2) throw new Error('Alphabet must have at least 2 unique characters');
    return bytesToBase(data, alphabet);
  });
