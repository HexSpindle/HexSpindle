import { module } from './_cat.js';
import { A } from '../../core/registry.js';

module('Levenshtein Distance', 'Edit distance between two strings (sample delimiter splits input into two).', [A.string('Sample delimiter', '\\n\\n')],
  (t, sd) => {
    sd = sd.replace(/\\n/g, '\n').replace(/\\t/g, '\t');
    if (!t.includes(sd)) throw new Error('Sample delimiter not found: provide two samples separated by it');
    const [a, b] = t.split(sd);
    const dp = Array.from({ length: a.length + 1 }, (_, i) => [i, ...Array(b.length).fill(0)]);
    for (let j = 0; j <= b.length; j++) dp[0][j] = j;
    for (let i = 1; i <= a.length; i++) for (let j = 1; j <= b.length; j++)
      dp[i][j] = a[i - 1] === b[j - 1] ? dp[i - 1][j - 1] : 1 + Math.min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1]);
    return String(dp[a.length][b.length]);
  }, { text: true });
