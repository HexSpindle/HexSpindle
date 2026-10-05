import { module } from './_cat.js';
import { A } from '../../core/registry.js';

function vigenere(t, key, sign) {
  const k = [...key.toUpperCase()].filter(c => /[A-Z]/.test(c)).map(c => c.charCodeAt(0) - 65);
  if (!k.length) throw new Error('Key must contain at least one letter');
  let ki = 0, out = '';
  for (const c of t) {
    if (/[A-Za-z]/.test(c)) {
      const base = c === c.toUpperCase() ? 65 : 97;
      out += String.fromCharCode((((c.charCodeAt(0) - base + sign * k[ki % k.length]) % 26) + 26) % 26 + base);
      ki++;
    } else out += c;
  }
  return out;
}

module('Vigenère Encode', 'Classic polyalphabetic cipher keyed by a repeating word.', [A.string('Key', '')], (t, key) => vigenere(t, key, 1), { text: true });
export { vigenere };
