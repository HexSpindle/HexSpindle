import { module } from './_cat.js';

function lsum(digs) {
  let s = 0;
  const rev = [...digs].reverse();
  rev.forEach((x, i) => { if (i % 2) { x *= 2; if (x > 9) x -= 9; } s += x; });
  return s;
}

module('Luhn Checksum', 'Computes the Luhn check digit and validates numbers (credit card style).', [],
  (t) => {
    const d = [...t].filter(c => /\d/.test(c)).map(Number);
    if (!d.length) return 'No digits';
    const chk = (10 - lsum([...d, 0]) % 10) % 10;
    return `Luhn sum (as given): ${lsum(d)}\nValid: ${lsum(d) % 10 === 0 ? 'yes' : 'no'}\nCheck digit to append: ${chk}\nWith check digit: ${d.join('')}${chk}`;
  }, { text: true });
