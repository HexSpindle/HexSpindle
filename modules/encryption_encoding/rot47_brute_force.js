import { module } from './_cat.js';
import { A } from '../../core/registry.js';

module('ROT47 Brute Force', 'Shows the input ROT47-rotated by every amount 1-93.',
  [A.number('Sample length', 100, 1), A.number('Sample offset', 0, 0), A.boolean('Print amount', true), A.string('Crib (known plaintext string)', '')],
  (t, slen, off, show, crib) => {
    const s = t.slice(off, off + slen);
    const out = [];
    for (let n = 1; n < 94; n++) {
      const r = [...s].map(c => {
        const o = c.codePointAt(0);
        return (o >= 33 && o <= 126) ? String.fromCharCode(33 + (o - 33 + n) % 94) : c;
      }).join('');
      if (crib && !r.includes(crib)) continue;
      out.push((show ? `Amount = ${String(n).padStart(2, ' ')}: ` : '') + r);
    }
    return out.join('\n');
  }, { text: true });
