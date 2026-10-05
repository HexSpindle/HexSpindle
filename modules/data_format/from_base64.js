import { module } from './_cat.js';
import { A } from '../../core/registry.js';
import { b64Decode, B64_PRESETS } from '../../core/codec.js';
import { decodeLatin1 } from '../../core/util.js';

module('From Base64', 'Decodes Base64 data (any alphabet).', [A.combo('Alphabet', B64_PRESETS), A.boolean('Remove non-alphabet chars', true), A.boolean('Strict mode', false)],
  (data, alphabet, remove, strict) => b64Decode(decodeLatin1(data), alphabet, remove, strict));
