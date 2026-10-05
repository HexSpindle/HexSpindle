import { module } from './_cat.js';
import { A } from '../../core/registry.js';
import { DELIMS, delim } from '../../core/util.js';
import { intToBase } from '../../core/codec.js';

const DIGITS = '0123456789abcdefghijklmnopqrstuvwxyz';

function hexPad(n) {
  const w = n < 256 ? 2 : n < 65536 ? 4 : n < 16777216 ? 6 : n < 4294967296 ? 8 : 2;
  return n.toString(16).padStart(w, '0');
}

module('To Charcode', 'Converts text to its Unicode character codes in the chosen base.', [A.select('Delimiter', DELIMS), A.number('Base', 16, 2, 36)],
  (t, d, base) => [...t].map(c => {
    const n = c.codePointAt(0);
    return base === 16 ? hexPad(n) : intToBase(n, DIGITS.slice(0, base));
  }).join(delim(d)), { text: true });
