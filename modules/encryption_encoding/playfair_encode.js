import { module } from './_cat.js';
import { A } from '../../core/registry.js';

function sq(key) {
  const seen = [];
  for (const c of (key.toUpperCase().replace(/J/g, 'I') + 'ABCDEFGHIKLMNOPQRSTUVWXYZ')) {
    if (/[A-Z]/.test(c) && !seen.includes(c)) seen.push(c);
  }
  return seen;
}

function pairs(t) {
  const letters = [...t.toUpperCase().replace(/J/g, 'I')].filter(c => /[A-Z]/.test(c));
  const out = [];
  let i = 0;
  while (i < letters.length) {
    const a = letters[i];
    const b = i + 1 < letters.length ? letters[i + 1] : 'X';
    if (a === b) {
      out.push([a, 'X']);
      i += 1;
    } else {
      out.push([a, b]);
      i += 2;
    }
  }
  return out;
}

function crypt(t, key, d) {
  const s = sq(key);
  const res = [];
  let ps;
  if (d === 1) {
    ps = pairs(t);
  } else {
    ps = [];
    for (let i = 0; i < t.length - 1; i += 2) ps.push([t[i], t[i + 1]]);
  }
  for (const [a, b] of ps) {
    const idxA = s.indexOf(a), idxB = s.indexOf(b);
    const ra = Math.floor(idxA / 5), ca = idxA % 5;
    const rb = Math.floor(idxB / 5), cb = idxB % 5;
    if (ra === rb) {
      res.push(s[ra * 5 + (((ca + d) % 5) + 5) % 5]);
      res.push(s[rb * 5 + (((cb + d) % 5) + 5) % 5]);
    } else if (ca === cb) {
      res.push(s[((((ra + d) % 5) + 5) % 5) * 5 + ca]);
      res.push(s[((((rb + d) % 5) + 5) % 5) * 5 + cb]);
    } else {
      res.push(s[ra * 5 + cb]);
      res.push(s[rb * 5 + ca]);
    }
  }
  return res.join('');
}

module('Playfair Encode', 'Encodes text with the Playfair digraph cipher (J=I, X as filler).',
  [A.string('Keyword', '')],
  (t, key) => crypt(t, key, 1), { text: true });

export { sq, pairs, crypt };
