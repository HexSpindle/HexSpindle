import { module } from './_cat.js';
import { A } from '../../core/registry.js';
import { parseMatrix, matmulMod } from './hill_cipher_encode.js';

function det(m) {
  if (m.length === 1) return m[0][0];
  if (m.length === 2) return m[0][0] * m[1][1] - m[0][1] * m[1][0];
  let d = 0;
  for (let c = 0; c < m.length; c++) {
    const minor = m.slice(1).map(row => row.slice(0, c).concat(row.slice(c + 1)));
    d += ((c % 2 === 0) ? 1 : -1) * m[0][c] * det(minor);
  }
  return d;
}

function modInverse(a, m) {
  a = ((a % m) + m) % m;
  for (let x = 1; x < m; x++) {
    if ((a * x) % m === 1) return x;
  }
  throw new Error('not invertible');
}

function matInverseMod26(mat, n) {
  const d = ((det(mat) % 26) + 26) % 26;
  const invD = modInverse(d, 26);
  if (n === 1) return [[invD]];
  const cof = [];
  for (let i = 0; i < n; i++) {
    cof.push(new Array(n).fill(0));
  }
  for (let i = 0; i < n; i++) {
    for (let j = 0; j < n; j++) {
      const minor = mat.filter((_, k2) => k2 !== i).map(row => row.slice(0, j).concat(row.slice(j + 1)));
      cof[i][j] = (((i + j) % 2 === 0) ? 1 : -1) * det(minor);
    }
  }
  const adj = [];
  for (let i = 0; i < n; i++) {
    adj.push([]);
    for (let j = 0; j < n; j++) adj[i].push(cof[j][i]);
  }
  const result = [];
  for (let i = 0; i < n; i++) {
    const row = [];
    for (let j = 0; j < n; j++) row.push((((adj[i][j] * invD) % 26) + 26) % 26);
    result.push(row);
  }
  return result;
}

module('Hill Cipher Decode', 'Decodes a Hill cipher. Key is N*N numbers forming an NxN matrix - it must be invertible mod 26.',
  [A.number('Matrix size (N)', 2, 2, 5), A.string('Key (N*N numbers, e.g. \'3 3 2 5\')', '3 3 2 5')],
  (t, n, key) => {
    const mat = parseMatrix(key, n);
    let inv;
    try {
      inv = matInverseMod26(mat, n);
    } catch (e) {
      throw new Error('Key matrix is not invertible mod 26 (determinant shares a factor with 26)');
    }
    const letters = [...t.toUpperCase()].filter(c => /[A-Z]/.test(c));
    const out = [];
    const limit = letters.length - (letters.length % n);
    for (let i = 0; i < limit; i += n) {
      const vec = letters.slice(i, i + n).map(c => c.charCodeAt(0) - 65);
      const res = matmulMod(inv, vec, 26);
      for (const v of res) out.push(String.fromCharCode(v + 65));
    }
    return out.join('');
  }, { text: true });
