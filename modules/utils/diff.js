import { module } from './_cat.js';
import { A, Html } from '../../core/registry.js';

const escapeHtml = s => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

function diffOpcodes(a, b, key) {
  const ka = a.map(key), kb = b.map(key);
  let start = 0;
  while (start < a.length && start < b.length && ka[start] === kb[start]) start++;
  let endA = a.length, endB = b.length;
  while (endA > start && endB > start && ka[endA - 1] === kb[endB - 1]) { endA--; endB--; }

  const ops = [];
  if (start) ops.push(['equal', 0, start, 0, start]);

  const n = endA - start, m = endB - start;
  if (n || m) {
    const sa = ka.slice(start, endA), sb = kb.slice(start, endB);
    const dp = Array.from({ length: n + 1 }, () => new Int32Array(m + 1));
    for (let i = n - 1; i >= 0; i--) for (let j = m - 1; j >= 0; j--)
      dp[i][j] = sa[i] === sb[j] ? dp[i + 1][j + 1] + 1 : Math.max(dp[i + 1][j], dp[i][j + 1]);
    let i = 0, j = 0;
    const mid = [];
    while (i < n && j < m) {
      if (sa[i] === sb[j]) { mid.push(['equal', start + i, start + j]); i++; j++; }
      else if (dp[i + 1][j] >= dp[i][j + 1]) { mid.push(['delete', start + i, start + j]); i++; }
      else { mid.push(['insert', start + i, start + j]); j++; }
    }
    while (i < n) { mid.push(['delete', start + i, start + j]); i++; }
    while (j < m) { mid.push(['insert', start + i, start + j]); j++; }
    for (const [tag, ai, bj] of mid) {
      const last = ops[ops.length - 1];
      if (last && last[0] === tag) { last[2] = ai + 1; last[4] = bj + 1; }
      else ops.push([tag, ai, ai + 1, bj, bj + 1]);
    }
  }
  if (endA < a.length) {
    const last = ops[ops.length - 1];
    if (last && last[0] === 'equal') { last[2] = a.length; last[4] = b.length; }
    else ops.push(['equal', endA, a.length, endB, b.length]);
  }
  return ops;
}

module('Diff', 'Compares two samples (separated by the sample delimiter) and shows additions/removals.',
  [A.string('Sample delimiter', '\\n\\n'), A.select('Diff by', ['Character', 'Word', 'Line']),
   A.boolean('Show added', true), A.boolean('Show removed', true), A.boolean('Show subtraction', false), A.boolean('Ignore whitespace', false)],
  (t, sd, by, added, removed, subtraction, ignoreWs) => {
    sd = sd.replace(/\\n/g, '\n').replace(/\\t/g, '\t').replace(/\\r/g, '\r');
    if (!sd || !t.includes(sd)) throw new Error('Sample delimiter not found: provide two samples separated by it');
    const idx = t.indexOf(sd);
    const a = t.slice(0, idx), b = t.slice(idx + sd.length);
    const tok = by === 'Character' ? s => [...s] : by === 'Word' ? s => s.match(/\s+|\S+/g) || [] : s => s.match(/[^\n]*\n|[^\n]+$/g) || [];
    const ta = tok(a), tb = tok(b);
    const key = ignoreWs ? (x => x.replace(/\s+/g, '')) : (x => x);
    const opcodes = diffOpcodes(ta, tb, key);
    const out = [];
    for (const [op, i1, i2, j1, j2] of opcodes) {
      if (op === 'equal') { out.push(escapeHtml(ta.slice(i1, i2).join(''))); continue; }
      if ((op === 'delete' || op === 'replace') && removed) out.push(`<del style="background:#5c1f2a;color:#ff8a9b;text-decoration:none">${escapeHtml(ta.slice(i1, i2).join(''))}</del>`);
      if ((op === 'insert' || op === 'replace') && added) out.push(`<ins style="background:#154a35;color:#7dffc0;text-decoration:none">${escapeHtml(tb.slice(j1, j2).join(''))}</ins>`);
    }
    return new Html(`<pre style="white-space:pre-wrap;margin:0">${out.join('')}</pre>`);
  }, { text: true });
