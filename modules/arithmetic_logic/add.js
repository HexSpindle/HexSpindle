import { module } from './_cat.js';
import { A } from '../../core/registry.js';

module('ADD', 'Adds a key to each byte (mod 256).', [A.toggle('Key', '', ['Hex', 'Decimal', 'UTF8', 'Latin1', 'Base64'], 'Hex')],
  (data, key) => key.length ? Uint8Array.from(data, (b, i) => (b + key[i % key.length]) & 255) : data);
