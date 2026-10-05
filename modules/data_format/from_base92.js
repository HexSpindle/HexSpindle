import { module } from './_cat.js';
import { ALPHA } from './to_base92.js';

module('From Base92', 'Decodes Base92 data.', [],
  (t) => {
    t = t.trim();
    if (t === '~') return new Uint8Array();
    let bits = '';
    for (let i = 0; i < t.length - 1; i += 2) {
      bits += (ALPHA.indexOf(t[i]) * 91 + ALPHA.indexOf(t[i + 1])).toString(2).padStart(13, '0');
    }
    if (t.length % 2) bits += ALPHA.indexOf(t[t.length - 1]).toString(2).padStart(6, '0');
    const out = [];
    for (let j = 0; j + 8 <= bits.length; j += 8) out.push(parseInt(bits.slice(j, j + 8), 2));
    return new Uint8Array(out);
  }, { text: true });
