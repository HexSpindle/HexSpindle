import { module } from './_cat.js';
import { A } from '../../core/registry.js';

function unescape(s) { return s.replace(/\\n/g, '\n').replace(/\\t/g, '\t').replace(/\\r/g, '\r'); }

module('Power Set', 'All subsets of a set.', [A.string('Item delimiter', ',')],
  (t, idl) => {
    idl = unescape(idl);
    const items = t.split(idl).filter(a => a);
    if (!items.length) return '';
    const n = items.length;
    const out = [];
    for (let m = 0; m < 2 ** n; m++) {
      const bits = m.toString(2).padStart(n, '0');
      out.push(items.filter((_, i) => bits[i] === '1').join(idl));
    }
    return out.sort((a, b) => a.length - b.length).map(s => `${s}\n`).join('');
  }, { text: true });
