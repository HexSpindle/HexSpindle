import { module } from './_cat.js';
import { A } from '../../core/registry.js';

function checksum(s, radix) {
  let even = false;
  return s.split('').reverse().reduce((acc, ch) => {
    let v = parseInt(ch, radix);
    if (isNaN(v)) throw new Error(`Character: ${ch} is not valid in radix ${radix}.`);
    if (even) { v *= 2; v = Math.floor(v / radix) + (v % radix); }
    even = !even;
    return acc + v;
  }, 0) % radix;
}

module('Luhn Checksum', 'Computes the Luhn (mod N) checksum and check digit of a string of digits in the given radix (10 = credit card style).',
  [A.number('Radix', 10, 2, 36)],
  (t, radix = 10) => {
    if (!t) return '';
    if (radix < 2 || radix > 36) throw new Error('Error: Radix argument must be between 2 and 36');
    if (radix % 2 !== 0) throw new Error('Error: Radix argument must be divisible by 2');
    const sum = checksum(t, radix).toString(radix);
    let digit = checksum(t + '0', radix);
    digit = (digit === 0 ? 0 : radix - digit).toString(radix);
    return `Checksum: ${sum}\nCheckdigit: ${digit}\nLuhn Validated String: ${t}${digit}`;
  }, { text: true });
