import { module } from './_cat.js';
import { A } from '../../core/registry.js';
import { parseNumbers } from './_num.js';

module('MOD', 'Computes the remainder of A divided by B for each pair of numbers in the input (one pair per line), or of each number by Modulus with the Line feed delimiter.', [A.select('Delimiter', ['Space', 'Comma', 'Line feed'], 'Space'), A.number('Modulus', 2)],
  (t, d, modulus = 2) => {
    if (d === 'Line feed') {
      const m = Number(modulus);
      if (m === 0) throw new Error('Modulus cannot be zero');
      return parseNumbers(t, 'Line feed').map(n => String(n % m)).join(' ');
    }
    const sep = d === 'Comma' ? ',' : ' ';
    const out = [];
    for (const line of t.split(/\r\n|\r|\n/)) {
      if (!line.trim()) continue;
      const [a, b] = line.split(sep).slice(0, 2).map(Number);
      out.push(String(a - Math.floor(a / b) * b));
    }
    return out.join('\n');
  }, { text: true });
