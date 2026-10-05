import { module } from './_cat.js';
import { A } from '../../core/registry.js';
import { ENCODING_GROUPS, decodeBytes } from './encode_text.js';

module(
  'Decode text',
  'Interprets bytes in a selected character encoding and outputs UTF-8 text.',
  [A.select('Encoding', ENCODING_GROUPS, 'UTF-8')],
  (data, enc) => decodeBytes(data, enc)
);