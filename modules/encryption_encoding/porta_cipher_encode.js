import { module } from './_cat.js';
import { A } from '../../core/registry.js';
import { portaTransform } from './_classical_ciphers.js';

module('Porta Cipher Encode', "Della Porta's reciprocal 13-table polyalphabetic cipher. Key pairs A/B, C/D, …, Y/Z select the same table.",
  [A.string('Key', 'FORTIFICATION')], (t, key) => portaTransform(t, key), { text: true });
