import { module } from './_cat.js';
import { A } from '../../core/registry.js';
import { resolveAlphabet } from '../../core/codec.js';
import { bytesToBase } from './_base.js';

export const DEFAULT = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz';

module('To Base62', 'Encodes data as Base62.', [A.string('Alphabet', DEFAULT)],
  (data, alphabet) => bytesToBase(data, resolveAlphabet(alphabet, 62)));
