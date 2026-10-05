import { module } from './_cat.js';
import { A } from '../../core/registry.js';
import { crypt } from './playfair_encode.js';

module('Playfair Decode', 'Decodes a Playfair cipher (filler letters are left in place).',
  [A.string('Keyword', '')],
  (t, key) => {
    const letters = [...t.toUpperCase().replace(/J/g, 'I')].filter(c => /[A-Z]/.test(c)).join('');
    return crypt(letters, key, -1);
  }, { text: true });
