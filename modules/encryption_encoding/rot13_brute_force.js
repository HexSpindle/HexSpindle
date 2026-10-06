import { module } from './_cat.js';
import { A } from '../../core/registry.js';
import { decodeUtf8OrChars, escapeWhitespace } from '../../core/util.js';

module('ROT13 Brute Force', 'Shows the input rotated by every amount 1-25 (optionally filtered by a crib).',
  [A.boolean('Rotate lower case chars', true), A.boolean('Rotate upper case chars', true), A.boolean('Rotate numbers', false),
   A.number('Sample length', 100, 1), A.number('Sample offset', 0, 0), A.boolean('Print amount', true), A.string('Crib (known plaintext string)', '')],
  (data, lo, up, nums, slen, off, show, crib) => {
    const sample = data.slice(off, off + slen);
    const cribLower = crib.toLowerCase();
    const out = [];
    for (let n = 1; n < 26; n++) {
      const rotated = Uint8Array.from(sample);
      for (let i = 0; i < rotated.length; i++) {
        const b = rotated[i];
        if (lo && b >= 97 && b < 123) rotated[i] = (b - 97 + n) % 26 + 97;
        else if (up && b >= 65 && b < 91) rotated[i] = (b - 65 + n) % 26 + 65;
        else if (nums && b >= 48 && b < 58) rotated[i] = (b - 48 + n) % 10 + 48;
      }
      const r = decodeUtf8OrChars(rotated);
      if (r.toLowerCase().indexOf(cribLower) < 0) continue;
      out.push((show ? `Amount = ${String(n).padStart(2, ' ')}: ` : '') + escapeWhitespace(r));
    }
    return out.join('\n');
  });
