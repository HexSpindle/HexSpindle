import { module } from './_cat.js';
import { A } from '../../core/registry.js';

const BTC_RE = /\b(?:[13][a-km-zA-HJ-NP-Z1-9]{25,34}|bc1[ac-hj-np-z02-9]{11,71})\b/g;

module('Extract Bitcoin addresses', 'Extracts legacy (1…, 3…) and bech32 (bc1…) Bitcoin addresses.',
  [A.boolean('Display total', false), A.boolean('Unique', true)],
  (t, total, uniq) => {
    let found = t.match(BTC_RE) || [];
    if (uniq) found = [...new Set(found)];
    const out = found.join('\n');
    return total ? `Total found: ${found.length}\n\n${out}` : out;
  }, { text: true });
