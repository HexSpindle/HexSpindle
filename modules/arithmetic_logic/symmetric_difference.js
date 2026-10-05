import { module } from './_cat.js';
import { A } from '../../core/registry.js';
import { splitSets } from './_sets.js';

module('Symmetric Difference', 'Items in exactly one of the two sets (input: A<sample delimiter>B).', [A.string('Sample delimiter', '\\n\\n'), A.string('Item delimiter', ',')],
  (t, sd, idl) => {
    const [sa, sb, d] = splitSets(t, sd, idl);
    const bs = new Set(sb), as = new Set(sa);
    const combined = [...sa.filter(x => !bs.has(x)), ...sb.filter(x => !as.has(x))];
    return [...new Set(combined)].join(d);
  }, { text: true });
