import { module } from './_cat.js';
import { A } from '../../core/registry.js';
import { autokeyDecode } from './_classical_ciphers.js';

module('Autokey Cipher Decode', 'Decodes Vigenère plaintext-autokey by recovering plaintext letters and feeding them back into the keystream after the primer.',
  [A.string('Primer key', 'QUEENLY')], (t, key) => autokeyDecode(t, key), { text: true, aliases: ['Vigenère Autokey Decode', 'Vigenere Autokey Decode'] });
