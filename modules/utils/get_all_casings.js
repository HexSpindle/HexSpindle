import { module } from './_cat.js';
import { A } from '../../core/registry.js';

module('Get All Casings', 'Lists every possible upper/lower case variant of the letters in the input (2^n variants - keep n small, 16 letters is already 65536 lines).', [A.number('Maximum letters', 16, 1, 24)],
  (t, maxlen) => {
    const chars = [...t];
    const letters = [];
    chars.forEach((c, i) => { if (/\p{L}/u.test(c)) letters.push(i); });
    if (letters.length > maxlen) throw new Error(`Input has ${letters.length} letters, more than the maximum of ${maxlen} (2^${letters.length} variants would be generated)`);
    const out = [];
    const total = 1 << letters.length;
    for (let mask = 0; mask < total; mask++) {
      const variant = [...chars];
      letters.forEach((pos, bit) => { variant[pos] = (mask >> bit) & 1 ? variant[pos].toUpperCase() : variant[pos].toLowerCase(); });
      out.push(variant.join(''));
    }
    return out.join('\n');
  }, { text: true });
