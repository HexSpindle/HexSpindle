import { module } from './_cat.js';
import { A } from '../../core/registry.js';

function ic(text) {
  const letters = text.toLowerCase().replace(/[^a-z]/g, '');
  const freq = new Array(26).fill(0);
  for (const c of letters) freq[c.charCodeAt(0) - 97]++;
  let coincidence = 0;
  for (const f of freq) coincidence += f * (f - 1);
  const density = Math.max(letters.length, 2);
  return coincidence / (density * (density - 1));
}

module('Index of Coincidence', 'Probability that two randomly chosen letters of the input are equal (English ≈ 0.066, random ≈ 0.038).',
  [A.boolean('Detailed report', false)],
  (t, report) => {
    const value = ic(t);
    if (!report) return String(value);
    return `Index of Coincidence: ${value}\nNormalised (×26): ${value * 26}  (English ≈ 1.73)\nLetters counted: ${t.toLowerCase().replace(/[^a-z]/g, '').length}`;
  }, { text: true });
