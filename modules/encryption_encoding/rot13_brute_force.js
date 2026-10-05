import { module } from './_cat.js';
import { A } from '../../core/registry.js';
import { rot } from './rot13.js';

module('ROT13 Brute Force', 'Shows the input rotated by every amount 1-25 (optionally filtered by a crib).',
  [A.boolean('Rotate lower case chars', true), A.boolean('Rotate upper case chars', true), A.boolean('Rotate numbers', false),
   A.number('Sample length', 100, 1), A.number('Sample offset', 0, 0), A.boolean('Print amount', true), A.string('Crib (known plaintext string)', '')],
  (t, lo, up, nums, slen, off, show, crib) => {
    const s = t.slice(off, off + slen);
    const out = [];
    for (let n = 1; n < 26; n++) {
      const r = rot(s, n, lo, up, nums);
      if (crib && !r.toLowerCase().includes(crib.toLowerCase())) continue;
      out.push((show ? `Amount = ${String(n).padStart(2, ' ')}: ` : '') + r);
    }
    return out.join('\n');
  }, { text: true });
