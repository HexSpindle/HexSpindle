import { module } from './_cat.js';
import { A } from '../../core/registry.js';
import { deriveKey, decryptPad, LETTERS } from './_ls47.js';

module('LS47 Decrypt',
  `LS47 pen-and-paper cipher decryption. Alphabet: <code>${LETTERS}</code>. Only strips the leading padding; any trailing "---signature" remains in the output.`,
  [A.string('Password', ''), A.number('Padding', 10, 0)],
  (input, password, padding) => {
    const key = deriveKey(password);
    return decryptPad(key, input, padding | 0);
  }, { text: true });
