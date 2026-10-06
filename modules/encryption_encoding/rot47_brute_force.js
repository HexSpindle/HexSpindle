import { module } from './_cat.js';
import { A } from '../../core/registry.js';
import { decodeUtf8OrChars, escapeWhitespace } from '../../core/util.js';

module('ROT47 Brute Force', 'Shows the input ROT47-rotated by every amount 1-93.',
  [A.number('Sample length', 100, 1), A.number('Sample offset', 0, 0), A.boolean('Print amount', true), A.string('Crib (known plaintext string)', '')],
  (data, slen, off, show, crib) => {
    const sample = data.slice(off, off + slen);
    const cribLower = crib.toLowerCase();
    const out = [];
    for (let n = 1; n < 94; n++) {
      const rotated = Uint8Array.from(sample);
      for (let i = 0; i < rotated.length; i++) {
        const b = rotated[i];
        if (b >= 33 && b <= 126) rotated[i] = (b - 33 + n) % 94 + 33;
      }
      const r = decodeUtf8OrChars(rotated);
      if (r.toLowerCase().indexOf(cribLower) < 0) continue;
      out.push((show ? `Amount = ${String(n).padStart(2, ' ')}: ` : '') + escapeWhitespace(r));
    }
    return out.join('\n');
  });
