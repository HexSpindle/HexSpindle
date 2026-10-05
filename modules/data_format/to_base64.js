import { module } from './_cat.js';
import { A } from '../../core/registry.js';
import { b64Encode } from '../../core/codec.js';
import { B64_PRESETS } from '../../core/codec.js';

module('To Base64', 'Base64 encodes the input using a configurable alphabet.', [A.combo('Alphabet', B64_PRESETS)],
  (data, alphabet) => b64Encode(data, alphabet));
