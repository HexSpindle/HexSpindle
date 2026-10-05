import { module } from './_cat.js';
import { A } from '../../core/registry.js';

module('Duplicate Line Finder', 'Finds and counts duplicate lines.',
  [A.boolean('Case sensitive', true), A.boolean('Trim whitespace', true), A.select('Output', ['Duplicates only', 'All lines with counts', 'Unique lines only'])],
  (t, caseSensitive, trim, mode) => {
    const lines = t.split('\n');
    let keys = lines.map(l => trim ? l.trim() : l);
    if (!caseSensitive) keys = keys.map(k => k.toLowerCase());
    const counts = new Map();
    keys.forEach(k => counts.set(k, (counts.get(k) || 0) + 1));
    if (mode === 'Unique lines only') {
      const seen = new Set(), out = [];
      lines.forEach((l, i) => { const k = keys[i]; if (counts.get(k) === 1 && !seen.has(k)) { out.push(l); seen.add(k); } });
      return out.join('\n');
    }
    const seen = new Set(), out = [];
    lines.forEach((l, i) => {
      const k = keys[i];
      if (seen.has(k)) return;
      seen.add(k);
      if (mode === 'Duplicates only' && counts.get(k) < 2) return;
      out.push(`${String(counts.get(k)).padStart(4)}  ${l}`);
    });
    return out.join('\n');
  }, { text: true });
