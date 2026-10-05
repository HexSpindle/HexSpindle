import { module } from './_cat.js';
import { A } from '../../core/registry.js';

function recursiveRemove(rx, s) {
  for (;;) { const n = s.replace(rx, ''); if (n.length === s.length) return n; s = n; }
}

module('Strip HTML tags', 'Removes all HTML tags from the input.',
  [A.boolean('Remove indentation', true), A.boolean('Remove excess line breaks', true)],
  (t, removeIndent = true, removeBreaks = true) => {
    t = recursiveRemove(/<[^>]+>/g, t);
    if (removeIndent) t = t.replace(/\n[ \f\t]+/g, '\n');
    if (removeBreaks) t = t.replace(/^\s*\n/, '').replace(/(\n\s*){2,}/g, '\n');
    return t;
  }, { text: true });
