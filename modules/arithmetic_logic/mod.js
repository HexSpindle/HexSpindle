import { module } from './_cat.js';
import { A } from '../../core/registry.js';

module('MOD', 'Computes the remainder of A divided by B for each pair of numbers in the input (one pair per line).', [A.select('Delimiter', ['Space', 'Comma'], 'Space')],
  (t, d) => {
    const sep = d === 'Comma' ? ',' : ' ';
    const out = [];
    for (const line of t.split(/\r\n|\r|\n/)) {
      if (!line.trim()) continue;
      const [a, b] = line.split(sep).slice(0, 2).map(Number);
      out.push(String(a - Math.floor(a / b) * b));
    }
    return out.join('\n');
  }, { text: true });
