import { module } from './_cat.js';
import { A } from '../../core/registry.js';

module('AND', 'Bitwise AND of each byte with a repeating key.', [A.toggle('Key', '', ['Hex', 'Decimal', 'UTF8', 'Latin1', 'Base64'], 'Hex')],
  (data, key) => key.length ? Uint8Array.from(data, (b, i) => b & key[i % key.length]) : data);
