import { module } from './_cat.js';
import { A } from '../../core/registry.js';
import { beaufortTransform } from './_classical_ciphers.js';

module('Beaufort Cipher Encode', 'Classic reciprocal Beaufort cipher using C = K − P (mod 26). Nonletters are preserved and do not advance the key.',
  [A.string('Key', 'FORTIFICATION')], (t, key) => beaufortTransform(t, key), { text: true });
