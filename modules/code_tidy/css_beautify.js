import { module } from './_cat.js';
import { A } from '../../core/registry.js';
import { css } from './_vkbeautify.js';

module('CSS Beautify', 'Indents and prettifies Cascading Style Sheets (CSS) code.', [A.string('Indent string', '\\t')],
  (t, indent) => css(t, indent.replace(/\\t/g, '\t')),
  { text: true }
);
