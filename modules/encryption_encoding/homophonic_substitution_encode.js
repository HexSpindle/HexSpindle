import { module } from './_cat.js';
import { A } from '../../core/registry.js';
import { defaultHomophonicMapping, homophonicEncode } from './_classical_ciphers.js';

module('Homophonic Substitution Encode', 'One-to-many substitution: each plaintext letter has one or more unique ciphertext symbols. Random selection is historically typical; Cycle mode is deterministic for testing and reproducible analysis.',
  [A.area('Mapping (one line per letter: A=00 01 …)', defaultHomophonicMapping()), A.select('Selection mode', ['Random', 'Cycle'], 'Random'), A.string('Output separator', ' ')],
  (t, mapping, mode, separator) => homophonicEncode(t, mapping, mode, separator), { text: true, nondeterministic: true });
