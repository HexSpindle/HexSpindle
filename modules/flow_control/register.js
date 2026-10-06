import { module } from './_cat.js';
import { A } from '../../core/registry.js';

module('Register', "Capture regex groups into registers: group 1 -> $R0, group 2 -> $R1, ... (numbering carries on across Register operations; a regex with no capture groups sets nothing). Use them in any later text argument; escape one as \\$R0.",
  [A.regex('Extract (regex)', '([\\s\\S]*)'), A.boolean('Case insensitive', true), A.boolean('Multiline', false), A.boolean('Dot matches all', false)],
  data => data, { flow: true });
