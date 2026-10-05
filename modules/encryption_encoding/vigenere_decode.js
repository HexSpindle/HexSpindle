import { module } from './_cat.js';
import { A } from '../../core/registry.js';
import { vigenere } from './vigenere_encode.js';

module('Vigenère Decode', 'Decodes a message encoded with Vigenère Encode.', [A.string('Key', '')], (t, key) => vigenere(t, key, -1), { text: true });
