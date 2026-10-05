import { module } from './_cat.js';
import { A } from '../../core/registry.js';

function parseMatrix(s, n) {
  const nums = (s.match(/-?\d+/g) || []).map(x => parseInt(x, 10));
  if (nums.length !== n * n) throw new Error(`Key must have exactly ${n * n} numbers for an ${n}x${n} matrix`);
  const mat = [];
  for (let i = 0; i < n; i++) mat.push(nums.slice(i * n, (i + 1) * n));
  return mat;
}

function matmulMod(mat, vec, mod) {
  const out = [];
  for (let i = 0; i < mat.length; i++) {
    let s = 0;
    for (let j = 0; j < vec.length; j++) s += mat[i][j] * vec[j];
    out.push(((s % mod) + mod) % mod);
  }
  return out;
}

module('Hill Cipher Encode', 'Polygraphic substitution cipher using matrix multiplication mod 26. Key is N*N numbers forming an NxN matrix (row-major); text is padded with X.',
  [A.number('Matrix size (N)', 2, 2, 5), A.string('Key (N*N numbers, e.g. \'3 3 2 5\')', '3 3 2 5')],
  (t, n, key) => {
    const mat = parseMatrix(key, n);
    let letters = [...t.toUpperCase()].filter(c => /[A-Z]/.test(c));
    const pad = ((-letters.length % n) + n) % n;
    for (let i = 0; i < pad; i++) letters.push('X');
    const out = [];
    for (let i = 0; i < letters.length; i += n) {
      const vec = letters.slice(i, i + n).map(c => c.charCodeAt(0) - 65);
      const res = matmulMod(mat, vec, 26);
      for (const v of res) out.push(String.fromCharCode(v + 65));
    }
    return out.join('');
  }, { text: true });

export { parseMatrix, matmulMod };
