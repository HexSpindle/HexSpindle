import { module } from './_cat.js';
import { A } from '../../core/registry.js';
import { ssdeepSimilarity } from './_ssdeep.js';

module('Compare SSDEEP hashes', 'Compares two SSDEEP fuzzy hashes to determine the similarity between them on a scale of 0 to 100. Input: HASH1<separator>HASH2.',
  [A.string('Separator', '\n')],
  (t, sep) => {
    const parts = t.trim().split(sep);
    if (parts.length !== 2) throw new Error(`Expected exactly two hashes separated by ${JSON.stringify(sep)}`);
    const [a, b] = parts;
    return ssdeepSimilarity(a.trim(), b.trim());
  }, { text: true });
