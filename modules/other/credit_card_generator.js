import { module } from './_cat.js';
import { A } from '../../core/registry.js';

const PREFIXES = { Visa: ['4'], Mastercard: ['51', '52', '53', '54', '55'], Amex: ['34', '37'], Discover: ['6011'] };
const LENGTHS = { Visa: 16, Mastercard: 16, Amex: 15, Discover: 16 };

function randomInt(maxExclusive) {
  const limit = 0x100000000 - (0x100000000 % maxExclusive);
  let x;
  do { x = crypto.getRandomValues(new Uint32Array(1))[0]; } while (x >= limit);
  return x % maxExclusive;
}
function randomChoice(arr) { return arr[randomInt(arr.length)]; }

module('Generate Test Credit Card Numbers', 'Generates syntactically valid (Luhn-passing) test card numbers for the given brand, for use in test/sandbox payment flows. These are NOT real card numbers.',
  [A.select('Brand', Object.keys(PREFIXES)), A.number('Count', 5, 1, 1000)],
  (data, brand, count) => {
    const out = [];
    for (let c = 0; c < count; c++) {
      const prefix = randomChoice(PREFIXES[brand]);
      const length = LENGTHS[brand];
      const digits = [...prefix].map(Number);
      for (let i = 0; i < length - prefix.length - 1; i++) digits.push(randomInt(10));
      let s = 0;
      const rev = [...digits, 0].reverse();
      rev.forEach((d, i) => { if (i % 2 === 1) { d *= 2; if (d > 9) d -= 9; } s += d; });
      const check = (10 - s % 10) % 10;
      out.push([...digits, check].join(''));
    }
    return out.join('\n') + '\n\nNote: these are algorithmically valid but fictitious numbers, for testing only.';
  }, { text: true, nondeterministic: true });
