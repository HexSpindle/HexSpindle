import { module } from './_cat.js';
import { A } from '../../core/registry.js';
import { cssmin } from './_vkbeautify.js';

module('CSS Minify', 'Compresses Cascading Style Sheets (CSS) code.', [A.boolean('Preserve comments', false)],
  (t, keep) => cssmin(t, keep),
  { text: true }
);
