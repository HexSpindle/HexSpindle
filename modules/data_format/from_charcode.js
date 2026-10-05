import { module } from './_cat.js';
import { A } from '../../core/registry.js';
import { DELIMS, delim, encodeUtf8 } from '../../core/util.js';

module('From Charcode', 'Converts Unicode character codes back to text.', [A.select('Delimiter', DELIMS), A.number('Base', 16, 2, 36)],
  (t, d, base) => {
    base = Number(base);
    let bites = t.split(delim(d));
    if (base < 2 || base > 36) throw new Error('Error: Base argument must be between 2 and 36');
    if (!t.length) return new Uint8Array();
    if (bites.length === 1 && t.length > 17) {
      bites = [];
      for (let i = 0; i < t.length; i += 2) bites.push(t.slice(i, i + 2));
    }
    let s = '';
    for (const b of bites) {
      let o = parseInt(b, base);
      if (o > 0xffff) {
        o -= 0x10000;
        s += String.fromCharCode(o >>> 10 & 0x3ff | 0xd800) + String.fromCharCode(0xdc00 | o & 0x3ff);
      } else s += String.fromCharCode(o);
    }
    for (let i = 0; i < s.length; i++) if (s.charCodeAt(i) > 255) return encodeUtf8(s);
    return Uint8Array.from(s, c => c.charCodeAt(0));
  }, { text: true });
