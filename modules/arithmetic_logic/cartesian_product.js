import { module } from './_cat.js';
import { A } from '../../core/registry.js';
import { splitSets } from './_sets.js';

module('Cartesian Product', 'Cartesian product of two sets (input: A<sample delimiter>B).', [A.string('Sample delimiter', '\\n\\n'), A.string('Item delimiter', ',')],
  (t, sd, idl) => {
    const [sa, sb, delim] = splitSets(t, sd, idl);
    const out = [];
    for (const a of sa) for (const b of sb) out.push(`(${a},${b})`);
    return out.join(delim);
  }, { text: true });
