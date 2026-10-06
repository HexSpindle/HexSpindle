import { module } from './_cat.js';
import { A } from '../../core/registry.js';
import { TABLE, DIGITS, MODES, BRAILLE_ASCII, BRAILLE_DOT6 } from './to_braille.js';

const REV = new Map([...TABLE].map(([k, v]) => [v, k]));
const REVD = new Map([...DIGITS].map(([k, v]) => [v, k]));

module('From Braille', 'Converts six-dot braille symbols to text.', [A.select('Mode', MODES)],
  (t, mode) => {
    if (mode !== 'Grade 1') {
      return [...t].map(b => {
        const idx = BRAILLE_DOT6.indexOf(b);
        return idx < 0 ? b : BRAILLE_ASCII[idx];
      }).join('');
    }
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
