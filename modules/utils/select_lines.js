import { module } from './_cat.js';
import { A } from '../../core/registry.js';
import { splitLines, parseRanges } from './_lines.js';

module('Select lines',
  'Keeps (or removes) lines by number. Lines are numbered from 1; use ranges such as 1,5-10, 20- (line 20 onwards) or -3 (the last three lines). '
  + 'Kept lines come out in the order you list them, so a selection can also reorder or repeat lines.',
  [A.string('Lines', '1-10'), A.boolean('Invert (remove these lines instead)', false)],
  (t, spec, invert) => {
    const { lines, eol } = splitLines(t);
    const chosen = parseRanges(spec, lines.length);
    if (!invert) return chosen.map(i => lines[i]).join(eol);
    const drop = new Set(chosen);
    return lines.filter((_, i) => !drop.has(i)).join(eol);
  }, { text: true, aliases: ['line range', 'slice lines', 'take lines', 'drop lines', 'sed', 'nth line'] });
