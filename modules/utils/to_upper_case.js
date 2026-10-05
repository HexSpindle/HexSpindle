import { module } from './_cat.js';
import { A } from '../../core/registry.js';

module('To Upper case', 'Converts to upper case.', [A.select('Scope', ['All', 'Word', 'Sentence'])],
  (t, scope) => {
    if (scope === 'All') return t.toUpperCase();
    if (scope === 'Word') return t.replace(/\b\w/g, c => c.toUpperCase());
    return t.replace(/(^|[.!?]\s*)([a-z])/g, (m, p, c) => p + c.toUpperCase());
  }, { text: true });
