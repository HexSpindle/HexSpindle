import { module } from './_cat.js';
import { A } from '../../core/registry.js';

const HASH_RE = /\b[0-9a-fA-F]{16,}\b/g;

module('Extract hashes', 'Extracts hexadecimal hash-like strings (MD5, SHA1, SHA256, SHA512 lengths).',
  [A.select('Hash character length', ['All', '32 (MD5)', '40 (SHA1)', '64 (SHA256)', '128 (SHA512)', 'Custom']), A.number('Custom length', 0, 0),
    A.boolean('Display total', false), A.boolean('Sort', false), A.boolean('Unique', false)],
  (t, kind, custom, total, srt, uniq) => {
    const lens = kind === 'All' ? [32, 40, 64, 128] : kind === 'Custom' ? [custom] : [parseInt(kind.split(' ')[0], 10)];
    let found = (t.match(HASH_RE) || []).filter(h => lens.includes(h.length));
    if (uniq) found = [...new Set(found)];
    if (srt) found = [...found].sort();
    const out = found.join('\n');
    return total ? `Total found: ${found.length}\n\n${out}` : out;
  }, { text: true });
