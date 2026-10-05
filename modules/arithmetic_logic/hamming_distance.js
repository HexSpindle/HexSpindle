import { module } from './_cat.js';
import { A } from '../../core/registry.js';

function unescape(s) { return s.replace(/\\n/g, '\n').replace(/\\t/g, '\t').replace(/\\r/g, '\r'); }
function popcount(b) { let c = 0; while (b) { c += b & 1; b >>= 1; } return c; }

module('Hamming Distance', 'Counts differing positions between two equal-length inputs (bytes, or bits if selected). Input: A<separator>B.',
  [A.string('Separator', '\\n'), A.select('Unit', ['Byte', 'Bit'])],
  (t, sep, unit) => {
    sep = unescape(sep);
    const i = t.indexOf(sep);
    if (i < 0) throw new Error('Separator not found: provide two equal-length values separated by it');
    const a = t.slice(0, i), b = t.slice(i + sep.length);
    if ([...a].length !== [...b].length) throw new Error(`Inputs must be the same length (${[...a].length} vs ${[...b].length})`);
    if (unit === 'Byte') {
      const ac = [...a], bc = [...b];
      let n = 0;
      for (let k = 0; k < ac.length; k++) if (ac[k] !== bc[k]) n++;
      return String(n);
    }
    const ab = new TextEncoder().encode(a), bb = new TextEncoder().encode(b);
    let n = 0;
    for (let k = 0; k < Math.min(ab.length, bb.length); k++) n += popcount(ab[k] ^ bb[k]);
    return String(n);
  }, { text: true });
