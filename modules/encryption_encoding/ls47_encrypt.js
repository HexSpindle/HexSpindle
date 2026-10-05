import { module } from './_cat.js';
import { A } from '../../core/registry.js';
import { deriveKey, encryptPad, LETTERS } from './_ls47.js';

module('LS47 Encrypt',
  `LS47 pen-and-paper cipher, an improvement of Alan Kaminsky's ElsieFour using a 7x7 grid. Alphabet: <code>${LETTERS}</code>`,
  [A.string('Password', ''), A.number('Padding', 10, 0), A.string('Signature', '')],
  (input, password, padding, signature) => {
    const key = deriveKey(password);
    return encryptPad(key, input, signature, padding | 0);
  }, { text: true });
