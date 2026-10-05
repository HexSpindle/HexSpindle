import { module } from './_cat.js';
import { A } from '../../core/registry.js';

module('Get All Casings', 'Lists every possible upper/lower case variant of the input, one per character position (2^n lines - keep n small, 16 is already 65536 lines).', [A.number('Maximum letters', 16, 1, 24)],
  (t, maxlen) => {
    const letters = [...t].filter(c => /\p{L}/u.test(c)).length;
    if (letters > maxlen) throw new Error(`Input has ${letters} letters, more than the maximum of ${maxlen} (2^${letters} variants would be generated)`);
    if (t.length > 24) throw new Error(`Input is ${t.length} characters long; 2^${t.length} lines would be generated (maximum 24 characters)`);
    const length = t.length;
    const max = 1 << length;
    const lower = t.toLowerCase();
    let result = '';
    for (let i = 0; i < max; i++) {
      const temp = lower.split('');
      for (let j = 0; j < length; j++) if (((i >> j) & 1) === 1) temp[j] = temp[j].toUpperCase();
      result += temp.join('') + '\n';
    }
    return result.slice(0, -1);
  }, { text: true });
