import { module } from './_cat.js';
import { A } from '../../core/registry.js';
import { beaufortTransform } from './_classical_ciphers.js';

module('Beaufort Cipher Decode', 'Decodes classic Beaufort. Beaufort is reciprocal, so decoding uses the same K − text transformation as encoding.',
  [A.string('Key', 'FORTIFICATION')], (t, key) => beaufortTransform(t, key), { text: true });
