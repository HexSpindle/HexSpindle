import { module } from './_cat.js';

module('Chi Square', 'Chi-square statistic of the byte distribution against a uniform distribution.', [],
  (data) => {
    const n = data.length;
    if (!n) return '0';
    const exp = n / 256;
    const counts = new Array(256).fill(0);
    for (const b of data) counts[b]++;
    let sum = 0;
    for (let i = 0; i < 256; i++) sum += (counts[i] - exp) ** 2 / exp;
    return sum.toFixed(4);
  });
