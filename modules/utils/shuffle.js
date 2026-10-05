import { module } from './_cat.js';
import { A } from '../../core/registry.js';
import { delim } from '../../core/util.js';

function mulberry32(seed) {
  let a = seed >>> 0;
  return function () {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

module('Shuffle', 'Randomly reorders the items (or characters/bytes). A seed makes it repeatable.', [A.string('Delimiter', '\\n'), A.number('Seed (0 = random)', 0, 0)],
  (t, d, seed) => {
    d = delim(d);
    const items = d ? t.split(d) : [...t];
    const rand = seed ? mulberry32(seed) : () => crypto.getRandomValues(new Uint32Array(1))[0] / 4294967296;
    for (let i = items.length - 1; i > 0; i--) {
      const j = Math.floor(rand() * (i + 1));
      [items[i], items[j]] = [items[j], items[i]];
    }
    return items.join(d);
  }, { text: true, nondeterministic: true });
