import { module } from './_cat.js';
import { A } from '../../core/registry.js';

module('Autokey Cipher Encode', 'Vigenère-family cipher where the key is extended with the plaintext itself (no repeating key weakness).',
  [A.string('Primer key', 'KEY')], (t, primer) => {
    const letters = [...t.toUpperCase()].filter(c => /[A-Z]/.test(c));
    const keyStream = [...primer.toUpperCase()].filter(c => /[A-Z]/.test(c)).map(c => c.charCodeAt(0) - 65)
      .concat(letters.map(c => c.charCodeAt(0) - 65));
    const out = [];
    let ki = 0;
    for (const c of t) {
      if (/[A-Za-z]/.test(c)) {
        const base = c === c.toUpperCase() ? 65 : 97;
        const shift = keyStream[ki++];
        out.push(String.fromCharCode((c.toUpperCase().charCodeAt(0) - 65 + shift) % 26 + base));
      } else out.push(c);
    }
    return out.join('');
  }, { text: true });
