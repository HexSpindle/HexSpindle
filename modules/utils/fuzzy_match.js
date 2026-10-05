import { module } from './_cat.js';
import { A } from '../../core/registry.js';

function pyRepr(s) {
  const quote = s.includes("'") && !s.includes('"') ? '"' : "'";
  let out = quote;
  for (const ch of s) {
    const code = ch.codePointAt(0);
    if (ch === '\\') out += '\\\\';
    else if (ch === quote) out += '\\' + quote;
    else if (ch === '\n') out += '\\n';
    else if (ch === '\r') out += '\\r';
    else if (ch === '\t') out += '\\t';
    else if (code < 0x20 || code === 0x7f) out += '\\x' + code.toString(16).padStart(2, '0');
    else out += ch;
  }
  return out + quote;
}

function findLongestMatch(a, b, aLo, aHi, bLo, bHi, b2j) {
  let bestI = aLo, bestJ = bLo, bestSize = 0;
  let j2len = new Map();
  for (let i = aLo; i < aHi; i++) {
    const newj2len = new Map();
    const js = b2j.get(a[i]);
    if (js) for (const j of js) {
      if (j < bLo) continue;
      if (j >= bHi) break;
      const k = (j2len.get(j - 1) || 0) + 1;
      newj2len.set(j, k);
      if (k > bestSize) { bestI = i - k + 1; bestJ = j - k + 1; bestSize = k; }
    }
    j2len = newj2len;
  }
  while (bestI > aLo && bestJ > bLo && a[bestI - 1] === b[bestJ - 1]) { bestI--; bestJ--; bestSize++; }
  while (bestI + bestSize < aHi && bestJ + bestSize < bHi && a[bestI + bestSize] === b[bestJ + bestSize]) bestSize++;
  return [bestI, bestJ, bestSize];
}

function seqRatio(a, b) {
  const b2j = new Map();
  for (let j = 0; j < b.length; j++) { const c = b[j]; if (!b2j.has(c)) b2j.set(c, []); b2j.get(c).push(j); }
  let matches = 0;
  const stack = [[0, a.length, 0, b.length]];
  while (stack.length) {
    const [alo, ahi, blo, bhi] = stack.pop();
    const [i, j, k] = findLongestMatch(a, b, alo, ahi, blo, bhi, b2j);
    if (k) {
      matches += k;
      if (alo < i && blo < j) stack.push([alo, i, blo, j]);
      if (i + k < ahi && j + k < bhi) stack.push([i + k, ahi, j + k, bhi]);
    }
  }
  return (a.length + b.length) ? 2 * matches / (a.length + b.length) : 1;
}

module('Fuzzy Match', 'Finds the best approximate match of a query inside the input (shows the match and a similarity percentage).',
  [A.string('Search', ''), A.number('Minimum score (%)', 50, 0, 100)],
  (t, q, minscore) => {
    if (!q) return t;
    const n = q.length;
    const qa = [...q];
    let best = 0, bestI = 0;
    const limit = Math.max(1, t.length - n + 1);
    for (let i = 0; i < limit; i++) {
      const r = seqRatio(qa, [...t.slice(i, i + n)]);
      if (r > best) { best = r; bestI = i; }
    }
    if (best * 100 < minscore) return 'No match above the minimum score';
    return `Best match: ${pyRepr(t.slice(bestI, bestI + n))} at offset ${bestI} (${Math.round(best * 100)}% similar)`;
  }, { text: true });
