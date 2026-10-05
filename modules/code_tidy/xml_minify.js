import { module } from './_cat.js';
import { A } from '../../core/registry.js';

module('XML Minify', 'Removes whitespace between tags (and optionally comments).', [A.boolean('Preserve comments', false)],
  (t, keep) => {
    if (!keep) t = t.replace(/<!--[\s\S]*?-->/g, '');
    return t.replace(/>\s+</g, '><').trim();
  },
  { text: true }
);
