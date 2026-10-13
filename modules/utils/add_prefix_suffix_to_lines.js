import { module } from './_cat.js';
import { A } from '../../core/registry.js';
import { splitLines } from './_lines.js';

const unescape = s => s.replace(/\\([tnr\\])/g, (_, c) => ({ t: '\t', n: '\n', r: '\r', '\\': '\\' }[c]));

module('Add prefix / suffix to lines',
  'Puts the given text before and/or after every line, for example to quote a list of values or turn it into SQL, CSV or code. \\t, \\n, \\r and \\\\ are understood in both fields.',
  [A.string('Prefix', ''), A.string('Suffix', ''), A.boolean('Skip empty lines', true)],
  (t, prefix, suffix, skipEmpty) => {
    const { lines, eol } = splitLines(t);
    const before = unescape(prefix), after = unescape(suffix);
    return lines.map(l => skipEmpty && l === '' ? l : before + l + after).join(eol);
  }, { text: true, aliases: ['prepend', 'append', 'prefix', 'suffix', 'quote lines', 'wrap lines'] });
