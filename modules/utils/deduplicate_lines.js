import { module } from './_cat.js';
import { A } from '../../core/registry.js';
import { splitLines } from './_lines.js';

module('Deduplicate lines',
  'Removes repeated lines. Lines can be compared ignoring case or surrounding whitespace, either across the whole text or only when repeats are adjacent (like uniq), '
  + 'keeping the first or the last occurrence. Empty lines are left in place unless told otherwise.',
  [A.boolean('Case sensitive', true), A.boolean('Ignore leading and trailing whitespace', false), A.select('Keep', ['First occurrence', 'Last occurrence']),
    A.select('Compare', ['All lines', 'Adjacent lines only']), A.boolean('Leave empty lines alone', true)],
  (t, caseSensitive, ignoreSpace, keep, scope, keepEmpty) => {
    const { lines, eol } = splitLines(t);
    const key = l => { let k = ignoreSpace ? l.trim() : l; if (!caseSensitive) k = k.toLowerCase(); return k; };
    const exempt = l => keepEmpty && !l.trim();
    const kept = new Array(lines.length).fill(true);
    if (scope === 'Adjacent lines only') {
      // Within a run of equal lines, keep its first or its last member.
      for (let i = 1; i < lines.length; i++) {
        if (exempt(lines[i]) || exempt(lines[i - 1]) || key(lines[i]) !== key(lines[i - 1])) continue;
        kept[keep === 'First occurrence' ? i : i - 1] = false;
      }
    } else {
      const seen = new Map();
      lines.forEach((l, i) => {
        if (exempt(l)) return;
        const k = key(l);
        if (!seen.has(k)) { seen.set(k, i); return; }
        if (keep === 'First occurrence') kept[i] = false; else { kept[seen.get(k)] = false; seen.set(k, i); }
      });
    }
    return lines.filter((_, i) => kept[i]).join(eol);
  }, { text: true, aliases: ['dedup', 'dedupe', 'remove duplicates', 'remove duplicate lines', 'uniq', 'distinct'] });
