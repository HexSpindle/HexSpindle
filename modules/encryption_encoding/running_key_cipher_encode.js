import { module } from './_cat.js';
import { A } from '../../core/registry.js';

module('Running Key Cipher Encode', 'Vigenère-family cipher keyed by a long passage of text (e.g. a book) instead of a short repeating key.',
  [A.area('Key text (must be at least as long as the plaintext letters)', '')],
  (t, keytext) => {
    const key = [...keytext.toUpperCase()].filter(c => /[A-Z]/.test(c)).map(c => c.charCodeAt(0) - 65);
    const out = [];
    let ki = 0;
    for (const c of t) {
      if (/[A-Za-z]/.test(c)) {
        if (ki >= key.length) throw new Error('Key text is shorter than the plaintext');
        const base = c === c.toUpperCase() ? 65 : 97;
        out.push(String.fromCharCode((((c.toUpperCase().charCodeAt(0) - 65 + key[ki]) % 26) + 26) % 26 + base));
        ki += 1;
      } else {
        out.push(c);
      }
    }
    return out.join('');
  }, { text: true });
