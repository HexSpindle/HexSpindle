import { module } from './_cat.js';
import { A } from '../../core/registry.js';

module('Register', "Capture regex groups into registers: group 1 -> $R0, group 2 -> $R1, ... (no groups: $R0 = whole match). Use them in any later text argument.",
  [A.regex('Extract (regex)', ''), A.boolean('Case insensitive', false), A.boolean('Multiline', true), A.boolean('Dot matches all', false)],
  data => data, { flow: true });
