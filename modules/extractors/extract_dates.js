import { module } from './_cat.js';
import { A } from '../../core/registry.js';

const DATE_RE = /\b(?:\d{4}[-/.]\d{1,2}[-/.]\d{1,2}|\d{1,2}[-/.]\d{1,2}[-/.]\d{2,4})\b/g;

module('Extract dates', 'Extracts yyyy-mm-dd, dd/mm/yyyy and mm/dd/yyyy style dates.',
  [A.boolean('Display total', false), A.boolean('Sort', false), A.boolean('Unique', false)],
  (t, total, srt, uniq) => {
    let found = t.match(DATE_RE) || [];
    if (uniq) found = [...new Set(found)];
    if (srt) found = [...found].sort();
    const out = found.join('\n');
    return total ? `Total found: ${found.length}\n\n${out}` : out;
  }, { text: true });
