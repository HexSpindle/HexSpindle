import { module } from './_cat.js';
import { A } from '../../core/registry.js';
import { expandAlphabet } from '../../core/codec.js';

module('Substitute', 'Maps each character of the plaintext alphabet to the same position of the ciphertext alphabet. Ranges like a-z are allowed.',
  [A.string('Plaintext', 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'), A.string('Ciphertext', 'XYZABCDEFGHIJKLMNOPQRSTUVW'), A.boolean('Ignore case', false)],
  (t, plain, cipher, ic) => {
    const p = expandAlphabet(plain), c = expandAlphabet(cipher);
    const m = new Map();
    for (let i = 0; i < p.length && i < c.length; i++) {
      const ch = p[i];
      m.set(ch, c[i]);
      if (ic) {
        if (ch.toLowerCase() !== ch) { if (!m.has(ch.toLowerCase())) m.set(ch.toLowerCase(), c[i].toLowerCase()); }
        if (ch.toUpperCase() !== ch) { if (!m.has(ch.toUpperCase())) m.set(ch.toUpperCase(), c[i].toUpperCase()); }
      }
    }
    return [...t].map(ch => m.get(ch) ?? ch).join('');
  }, { text: true });
