import { module } from './_cat.js';
import { A } from '../../core/registry.js';
import { reFlags } from '../../core/util.js';

module('Filter', 'Keeps (or removes) lines matching a regex.', [A.regex('Regex', ''), A.boolean('Invert (remove matches)', false), A.boolean('Case insensitive', false)],
  (t, rx, invert, ci) => { const re = new RegExp(rx, reFlags(ci)); return t.split('\n').filter(l => re.test(l) !== invert).join('\n'); }, { text: true });
