import { module } from './_cat.js';
import { A } from '../../core/registry.js';

function square(keyword) {
  const seen = [];
  for (const c of (keyword.toUpperCase().replace(/J/g, 'I') + 'ABCDEFGHIKLMNOPQRSTUVWXYZ')) {
    if (/[A-Z]/.test(c) && !seen.includes(c)) seen.push(c);
  }
  return seen;
}

const ALPHA = 'ABCDEFGHIKLMNOPQRSTUVWXYZ';

export function bifid(input, keyword, decode) {
  const key = keyword.toUpperCase().replace('J', 'I');
  if (key.length && !/^[A-Z]+$/.test(key)) throw new Error('The key must consist only of letters in the English alphabet');
  const sq = [...new Set(key + ALPHA)];
  const at = (r, c) => sq[r * 5 + Number(c)];
  const rows = [], cols = [], structure = [];
  let trans = '';
  for (const ch of input.replace('J', 'I')) {
    const u = ch.toLocaleUpperCase();
    if (!ALPHA.includes(u)) { structure.push(ch); continue; }
    const idx = sq.indexOf(u);
    if (decode) trans += `${Math.floor(idx / 5)}${idx % 5}`;
    else { rows.push(Math.floor(idx / 5)); cols.push(idx % 5); }
    structure.push(ALPHA.includes(ch));
  }
  if (!decode) trans = rows.join('') + cols.join('');
  let out = '', n = 0;
  for (const p of structure) {
    if (typeof p !== 'boolean') { out += p; continue; }
    const [r, c] = decode ? [trans[n], trans[n + trans.length / 2]] : [trans[2 * n], trans[2 * n + 1]];
    const l = at(Number(r), c);
    out += p ? l : l.toLocaleLowerCase();
    n++;
  }
  return out;
}

module('Bifid Cipher Encode', 'Encodes text with the Bifid cipher (5x5 Polybius square, J=I).', [A.string('Keyword', '')],
  (t, keyword) => bifid(t, keyword, false), { text: true });

export { square };
