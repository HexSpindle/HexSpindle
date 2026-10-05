import { module } from './_cat.js';

module('Diff Summary', 'Compares two newline-separated lists (e.g. two recipe outputs) and reports counts of added/removed/common lines, without the full HTML diff.', [],
  (t) => {
    const hasSplit = t.includes('\0SPLIT\0');
    const hasTriple = t.includes('\n\n\n');
    if (!hasTriple && !hasSplit) throw new Error('Provide two blocks of lines separated by a blank line (\\n\\n\\n) or \\0SPLIT\\0');
    const sep = hasSplit ? '\0SPLIT\0' : '\n\n\n';
    const idx = t.indexOf(sep);
    const a = t.slice(0, idx), b = t.slice(idx + sep.length);
    const sa = new Set(a.split('\n')), sb = new Set(b.split('\n'));
    const added = [...sb].filter(x => !sa.has(x)).sort();
    const removed = [...sa].filter(x => !sb.has(x)).sort();
    const common = [...sa].filter(x => sb.has(x));
    return ['Common: ' + common.length, 'Added: ' + added.length, 'Removed: ' + removed.length, '',
      'Added lines:', ...added, '', 'Removed lines:', ...removed].join('\n');
  }, { text: true });
