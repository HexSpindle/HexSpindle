import { module } from './_cat.js';
import { A } from '../../core/registry.js';
import { delim } from '../../core/util.js';
import { ssdeepSimilarity } from './_ssdeep.js';

module('Compare SSDEEP hashes', 'Compares two SSDEEP fuzzy hashes to determine the similarity between them on a scale of 0 to 100. Input: HASH1<separator>HASH2.',
  [A.string('Separator', '\n')],
  (t, sep) => {
    sep = delim(sep);
    const parts = t.split(sep);
    if (parts.length !== 2) throw new Error('Incorrect number of samples.');
    return ssdeepSimilarity(parts[0], parts[1]);
  }, { text: true });
