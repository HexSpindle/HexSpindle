import { module } from './_cat.js';
import { A } from '../../core/registry.js';
import { reFlags } from '../../core/util.js';

module('Count occurrences', 'Counts how many times a string or regex matches.', [A.string('Search', ''), A.boolean('Regex', false), A.boolean('Case sensitive', true)],
  (t, search, isRegex, cs) => {
    if (!search) return '0';
    if (isRegex) return (t.match(new RegExp(search, reFlags(!cs) + 'g')) || []).length.toString();
    const hay = cs ? t : t.toLowerCase(), needle = cs ? search : search.toLowerCase();
    let count = 0, i = 0;
    while ((i = hay.indexOf(needle, i)) !== -1) { count++; i += needle.length; }
    return count.toString();
  }, { text: true });
