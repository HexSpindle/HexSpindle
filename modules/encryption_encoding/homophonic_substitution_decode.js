import { module } from './_cat.js';
import { A } from '../../core/registry.js';
import { defaultHomophonicMapping, homophonicDecode } from './_classical_ciphers.js';

module('Homophonic Substitution Decode', 'Decodes a homophonic substitution mapping. Every ciphertext symbol must map back to exactly one plaintext letter, making decipherment deterministic when the key is known.',
  [A.area('Mapping (one line per letter: A=00 01 …)', defaultHomophonicMapping())],
  (t, mapping) => homophonicDecode(t, mapping), { text: true });
