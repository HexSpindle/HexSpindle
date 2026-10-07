import { module } from './_cat.js';
import { A } from '../../core/registry.js';
import { portaTransform } from './_classical_ciphers.js';

module('Porta Cipher Decode', 'Decodes the Porta cipher. The 13 Porta substitutions are reciprocal, so encryption and decryption are the same operation.',
  [A.string('Key', 'FORTIFICATION')], (t, key) => portaTransform(t, key), { text: true });
