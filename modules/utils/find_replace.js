import { module } from './_cat.js';
import { A } from '../../core/registry.js';
import { reFlags } from '../../core/util.js';

module('Find / Replace', 'Finds text (literal, regex, or extended-escape) and replaces it.',
  [A.string('Find', ''), A.string('Replace', ''), A.select('Mode', ['Simple string', 'Regex', 'Extended (\\n, \\t, ...)']),
   A.boolean('Global match', true), A.boolean('Case insensitive', false), A.boolean('Multiline matching', true), A.boolean('Dot matches all', false)],
  (t, find, replace, mode, global, ci, mlt, dot) => {
    if (mode === 'Simple string') {
      if (!find) return t;
      return global ? t.split(find).join(replace) : t.replace(find, replace);
    }
    if (mode === 'Extended (\\n, \\t, ...)') {
      const unesc = s => s.replace(/\\n/g, '\n').replace(/\\t/g, '\t').replace(/\\r/g, '\r');
      find = unesc(find); replace = unesc(replace);
      return global ? t.split(find).join(replace) : t.replace(find, replace);
    }
    const re = new RegExp(find, reFlags(ci, mlt, dot) + (global ? 'g' : ''));
    return t.replace(re, replace.replace(/\$(\d)/g, '$$$1'));
  }, { text: true });
