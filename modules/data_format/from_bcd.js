import { module } from './_cat.js';
import { A } from '../../core/registry.js';
import { SCHEMES } from './to_bcd.js';

module('From Binary Coded Decimal', 'Decodes BCD nibbles (given as binary text) into decimal digits.',
  [A.select('Scheme', Object.keys(SCHEMES))], (t, scheme) => {
    const bits = t.replace(/[^01]/g, '');
    const rev = new Map(SCHEMES[scheme].map((v, i) => [v, i]));
    const out = [];
    for (let i = 0; i + 4 <= bits.length; i += 4) {
      const v = parseInt(bits.slice(i, i + 4), 2);
      out.push(rev.has(v) ? String(rev.get(v)) : '?');
    }
    return out.join('');
  }, { text: true });
