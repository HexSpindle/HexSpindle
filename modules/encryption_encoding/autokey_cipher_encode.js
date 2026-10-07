import { module } from './_cat.js';
import { A } from '../../core/registry.js';
import { autokeyEncode } from './_classical_ciphers.js';

module('Autokey Cipher Encode', 'Vigenère plaintext-autokey: starts with a primer, then extends the keystream with the plaintext itself. Nonletters are preserved and do not advance the keystream.',
  [A.string('Primer key', 'QUEENLY')], (t, key) => autokeyEncode(t, key), { text: true, aliases: ['Vigenère Autokey Encode', 'Vigenere Autokey Encode'] });
