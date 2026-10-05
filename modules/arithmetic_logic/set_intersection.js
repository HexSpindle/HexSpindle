import { module } from './_cat.js';
import { A } from '../../core/registry.js';
import { splitSets } from './_sets.js';

module('Set Intersection', 'Items present in both sets (input: A<sample delimiter>B).', [A.string('Sample delimiter', '\\n\\n'), A.string('Item delimiter', ',')],
  (t, sd, idl) => {
    const [sa, sb, d] = splitSets(t, sd, idl);
    const bs = new Set(sb);
    return [...new Set(sa)].filter(x => bs.has(x)).join(d);
  }, { text: true });
