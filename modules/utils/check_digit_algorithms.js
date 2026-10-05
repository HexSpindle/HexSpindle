import { module } from './_cat.js';
import { A } from '../../core/registry.js';

const VERHOEFF_D = [
  [0,1,2,3,4,5,6,7,8,9],[1,2,3,4,0,6,7,8,9,5],[2,3,4,0,1,7,8,9,5,6],[3,4,0,1,2,8,9,5,6,7],[4,0,1,2,3,9,5,6,7,8],
  [5,9,8,7,6,0,4,3,2,1],[6,5,9,8,7,1,0,4,3,2],[7,6,5,9,8,2,1,0,4,3],[8,7,6,5,9,3,2,1,0,4],[9,8,7,6,5,4,3,2,1,0],
];
const VERHOEFF_P = [
  [0,1,2,3,4,5,6,7,8,9],[1,5,7,6,2,8,3,0,9,4],[5,8,0,3,7,9,6,1,4,2],[8,9,1,6,0,4,3,5,2,7],
  [9,4,5,3,1,2,6,8,7,0],[4,2,8,6,5,7,3,9,0,1],[2,7,9,3,8,0,6,4,1,5],[7,0,4,6,9,1,3,2,5,8],
];
const VERHOEFF_INV = [0, 4, 3, 2, 1, 5, 6, 7, 8, 9];
const DAMM_T = [
  [0,3,1,7,5,9,8,6,4,2],[7,0,9,2,1,5,4,8,6,3],[4,2,0,6,8,7,1,3,5,9],[1,7,5,0,9,8,3,4,2,6],
  [6,1,2,3,0,4,5,9,7,8],[3,6,7,4,2,0,9,5,8,1],[5,8,6,9,7,2,0,1,3,4],[8,9,4,5,3,6,2,0,1,7],
  [9,4,3,8,6,1,7,2,0,5],[2,5,8,1,4,3,6,7,9,0],
];

function verhoeffCheck(digits) {
  let c = 0;
  const rev = [...digits].reverse();
  rev.forEach((d, i) => { c = VERHOEFF_D[c][VERHOEFF_P[i % 8][d]]; });
  return c;
}

function dammCheck(digits) {
  let c = 0;
  for (const d of digits) c = DAMM_T[c][d];
  return c;
}

module('Check Digit Calculator', 'Computes or verifies a Verhoeff or Damm check digit for a numeric string (both detect all single-digit errors and all adjacent transpositions).',
  [A.select('Algorithm', ['Verhoeff', 'Damm']), A.select('Mode', ['Compute check digit', 'Verify (last digit is the check digit)'])],
  (t, algo, mode) => {
    const digits = [...t.trim()].filter(c => /[0-9]/.test(c)).map(Number);
    if (!digits.length) throw new Error('No digits found in the input');
    const fn = algo === 'Verhoeff' ? verhoeffCheck : dammCheck;
    if (mode === 'Verify (last digit is the check digit)') {
      const c = fn(digits);
      const ok = c === 0;
      return `${ok ? 'VALID' : 'INVALID'}: ${algo} check of ${digits.join('')} is ${c} (valid when 0)`;
    }
    const check = algo === 'Verhoeff' ? VERHOEFF_INV[verhoeffCheck([...digits, 0])] : dammCheck(digits);
    return `Check digit: ${check}\nWith check digit appended: ${digits.join('')}${check}`;
  }, { text: true });
