import { module } from './_cat.js';
import { A } from '../../core/registry.js';
import { rc4 } from './rc4.js';

module('RC4 Drop', 'RC4 that discards the first N keystream bytes (RC4-drop[N]).',
  [A.toggle('Passphrase', '', ['UTF8', 'Hex', 'Latin1', 'Base64'], 'UTF8'), A.number('Number of bytes to drop', 768, 0)],
  (data, key, drop) => rc4(key, data, drop));
