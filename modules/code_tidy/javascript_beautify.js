import { module } from './_cat.js';
import { A } from '../../core/registry.js';
import { beautify } from './_jstok.js';

module('JavaScript Beautify', 'Indents and formats JavaScript (token-based; handles strings, regex and templates).',
  [A.string('Indent string', '    ')],
  (t, indent) => beautify(t, indent.replace(/\\t/g, '\t')),
  { text: true }
);
