import { module } from './_cat.js';
import { TABLE, DIGITS } from './to_braille.js';

const REV = new Map([...TABLE].map(([k, v]) => [v, k]));
const REVD = new Map([...DIGITS].map(([k, v]) => [v, k]));

module('From Braille', 'Converts Unicode Braille back to text.', [],
  (t) => {
    const out = [];
    let cap = false, num = false;
    for (const c of t) {
      if (c === '⠠') { cap = true; continue; }
      if (c === '⠼') { num = true; continue; }
      if (num && REVD.has(c)) {
        out.push(REVD.get(c));
        continue;
      }
      const ch = REV.has(c) ? REV.get(c) : c;
      if (ch === ' ' || ch === '\n' || !REV.has(c)) num = false;
      out.push(cap ? ch.toUpperCase() : ch);
      cap = false;
    }
    return out.join('');
  }, { text: true });
