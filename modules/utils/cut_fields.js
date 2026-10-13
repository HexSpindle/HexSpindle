import { module } from './_cat.js';
import { A } from '../../core/registry.js';
import { delim } from '../../core/util.js';
import { splitLines, parseRanges } from './_lines.js';

module('Cut fields',
  'Keeps selected fields (columns) of every line, like cut or a simple awk: each line is split on a delimiter and the fields you list are output, in the order you list them. '
  + 'Fields are numbered from 1; use ranges such as 1,3-5, 2- (field 2 onwards) or -1 (the last field). The delimiter accepts \\t style escapes. Quoted CSV fields are not interpreted.',
  [A.string('Delimiter', ','), A.string('Fields', '1'), A.string('Output delimiter (blank = same as input)', ''), A.boolean('Drop lines that do not contain the delimiter', false)],
  (t, d, fields, outD, dropUndelimited) => {
    const split = delim(d);
    if (!split) throw new Error('Delimiter must not be empty');
    const join = outD === '' ? split : delim(outD);
    const { lines, eol } = splitLines(t);
    const out = [];
    for (const line of lines) {
      if (!line.includes(split)) { if (!dropUndelimited) out.push(line); continue; }
      const parts = line.split(split);
      out.push(parseRanges(fields, parts.length).map(i => parts[i]).join(join));
    }
    return out.join(eol);
  }, { text: true, aliases: ['cut', 'column', 'columns', 'select columns', 'extract column', 'awk', 'fields'] });
