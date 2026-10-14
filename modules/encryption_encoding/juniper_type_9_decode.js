import { module } from './_cat.js';

// Junos "$9$" secrets: a fixed, keyless obfuscation. Each plaintext character is spread over two to four
// ciphertext characters, stored as the gaps between consecutive characters of this alphabet.
const FAMILY = ['QzF3n6/9CAtpu0O', 'B1IREhcSyrleKvMW8LXx', '7N-dVbwsY2g4oaJZGUDj', 'iHkq.mPf5T'];
const ALPHABET = FAMILY.join('');
const EXTRA = new Map(FAMILY.flatMap((family, i) => [...family].map(c => [c, 3 - i])));
const ENCODING = [[1, 4, 32], [1, 16, 32], [1, 8, 32], [1, 64], [1, 32], [1, 4, 16, 128], [1, 32, 64]];

export function decodeType9(secret) {
  const s = secret.trim();
  if (!s.startsWith('$9$')) throw new Error('A Junos type 9 secret starts with $9$');
  let chars = s.slice(3);
  if (!chars.length || [...chars].some(c => !ALPHABET.includes(c))) throw new Error('This $9$ value contains characters that are not part of the format');
  const take = n => { if (chars.length < n) throw new Error('This $9$ value is truncated'); const head = chars.slice(0, n); chars = chars.slice(n); return head; };
  let previous = take(1);
  take(EXTRA.get(previous));   // random filler chosen by the first character
  let out = '';
  while (chars.length) {
    const weights = ENCODING[out.length % ENCODING.length];
    let value = 0;
    for (const [i, c] of [...take(weights.length)].entries()) {
      const gap = ((ALPHABET.indexOf(c) - ALPHABET.indexOf(previous)) % ALPHABET.length + ALPHABET.length) % ALPHABET.length - 1;
      value += gap * weights[i];
      previous = c;
    }
    out += String.fromCharCode(((value % 256) + 256) % 256);
  }
  return out;
}

module('Juniper Type 9 Decode',
  'Decodes Junos "$9$" secrets (the reversible obfuscation used for passwords and keys in Juniper configurations). '
  + 'Accepts bare values or whole configuration lines, one per line; every $9$ value found is replaced by its plaintext.',
  [],
  (t) => {
    if (!t.includes('$9$')) throw new Error('No $9$ value found in the input');
    return t.replace(/\$9\$[A-Za-z0-9./-]+/g, secret => { try { return decodeType9(secret); } catch { return secret; } });
  }, { text: true, aliases: ['junos', 'juniper password', '$9$'] });
