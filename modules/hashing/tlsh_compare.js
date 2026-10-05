import { module } from './_cat.js';
import { A } from '../../core/registry.js';
import { parseTlshStr, totalDiff } from './tlsh_fuzzy_hash.js';

module('Compare TLSH Hashes', "Compares two TLSH hashes and reports their difference score - 0 means identical, and roughly under 30 suggests related/similar files. Input: HASH1<separator>HASH2.",
  [A.string('Separator', ' ')],
  (t, sep) => {
    const parts = t.trim().split(sep);
    if (parts.length !== 2) throw new Error(`Expected exactly two hashes separated by ${JSON.stringify(sep)}`);
    const [a, b] = parts;
    const score = totalDiff(parseTlshStr(a), parseTlshStr(b));
    const verdict = score === 0 ? 'Identical' : score < 30 ? 'Very similar' : score < 100 ? 'Possibly related' : 'Likely unrelated';
    return `Difference score: ${score}\nVerdict: ${verdict}`;
  }, { text: true });
