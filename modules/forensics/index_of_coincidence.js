import { module } from './_cat.js';

module('Index of Coincidence', 'Probability that two randomly chosen bytes are equal (English ≈ 0.066, random bytes ≈ 0.0039).', [],
  (data) => {
    const n = data.length;
    if (n < 2) return 'Input too short';
    const counts = new Map();
    for (const b of data) counts.set(b, (counts.get(b) || 0) + 1);
    let sum = 0;
    for (const c of counts.values()) sum += c * (c - 1);
    const ic = sum / (n * (n - 1));
    return `Index of Coincidence: ${ic.toFixed(6)}\nNormalised (×256): ${(ic * 256).toFixed(4)}  (random ≈ 1.0)\nNormalised (×26, letters): ${(ic * 26).toFixed(4)}  (English ≈ 1.73)`;
  });
