import { module } from './_cat.js';
import { A } from '../../core/registry.js';
import { solitaireDecode } from './_classical_ciphers.js';

module('Solitaire/Pontifex Decode', 'Decodes Solitaire/Pontifex with the same passphrase-keyed deck. Padding X characters are left in place because their removal is not unambiguous.',
  [A.string('Passphrase', '')], (t, passphrase) => solitaireDecode(t, passphrase), { text: true });
