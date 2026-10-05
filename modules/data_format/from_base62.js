import { module } from './_cat.js';
import { A } from '../../core/registry.js';
import { resolveAlphabet } from '../../core/codec.js';
import { decodeLatin1 } from '../../core/util.js';
import { baseToBytes } from './_base.js';
import { DEFAULT } from './to_base62.js';

module('From Base62', 'Decodes Base62 data.', [A.string('Alphabet', DEFAULT)],
  (data, alphabet) => baseToBytes(decodeLatin1(data).trim(), resolveAlphabet(alphabet, 62)));
