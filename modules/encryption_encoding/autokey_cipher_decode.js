import { module } from './_cat.js';
import { A } from '../../core/registry.js';

module('Autokey Cipher Decode', 'Decodes an Autokey cipher.', [A.string('Primer key', 'KEY')],
  (t, primer) => {
    const keyStream = [...primer.toUpperCase()].filter(c => /[A-Z]/.test(c)).map(c => c.charCodeAt(0) - 65);
    const out = [], plainLetters = [];
    for (const c of t) {
      if (/[A-Za-z]/.test(c)) {
        const base = c === c.toUpperCase() ? 65 : 97;
        const ki = plainLetters.length;
        const shift = ki < keyStream.length ? keyStream[ki] : plainLetters[ki - keyStream.length];
        const p = (((c.toUpperCase().charCodeAt(0) - 65 - shift) % 26) + 26) % 26;
        plainLetters.push(p);
        out.push(String.fromCharCode(p + base));
      } else out.push(c);
    }
    return out.join('');
  }, { text: true });
