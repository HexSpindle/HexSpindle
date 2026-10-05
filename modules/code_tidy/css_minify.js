import { module } from './_cat.js';
import { A } from '../../core/registry.js';

module('CSS Minify', 'Removes comments and unnecessary whitespace from CSS.', [A.boolean('Preserve comments', false)],
  (t, keep) => {
    if (!keep) t = t.replace(/\/\*[\s\S]*?\*\//g, '');
    t = t.replace(/\s+/g, ' ');
    t = t.replace(/\s*([{};,>~])\s*/g, '$1');
    t = t.replace(/\s*:\s*/g, ':');
    return t.replace(/;}/g, '}').trim();
  },
  { text: true }
);
