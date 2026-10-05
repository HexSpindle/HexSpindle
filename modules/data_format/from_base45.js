import { module } from './_cat.js';
import { CH } from './to_base45.js';

module('From Base45', 'Decodes Base45 (RFC 9285) data.', [],
  (t) => {
    t = t.trim();
    const v = [...t].map(c => { const i = CH.indexOf(c); if (i < 0) throw new Error(`Character not in alphabet: ${JSON.stringify(c)}`); return i; });
    const out = [];
    for (let i = 0; i < v.length; i += 3) {
      const g = v.slice(i, i + 3);
      if (g.length === 3) {
        const n = g[0] + g[1] * 45 + g[2] * 2025;
        if (n > 65535) throw new Error('Invalid Base45 triplet');
        out.push(n >> 8, n & 255);
      } else if (g.length === 2) {
        out.push(g[0] + g[1] * 45);
      } else {
        throw new Error('Invalid Base45 length');
      }
    }
    return new Uint8Array(out);
  }, { text: true });
