import { module } from './_cat.js';
import { A } from '../../core/registry.js';
import { splitSets } from './_sets.js';

module('Set Union', 'Union of two sets split by a delimiter (input: A<sample delimiter>B).', [A.string('Sample delimiter', '\\n\\n'), A.string('Item delimiter', ',')],
  (t, sd, idl) => {
    const [sa, sb, d] = splitSets(t, sd, idl);
    return [...new Set([...sa, ...sb])].join(d);
  }, { text: true });
