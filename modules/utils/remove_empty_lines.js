import { module } from './_cat.js';
import { A } from '../../core/registry.js';
import { splitLines } from './_lines.js';

module('Remove empty lines',
  'Removes blank lines. Lines holding only spaces or tabs can count as empty, and instead of removing every blank line, runs of them can be collapsed to one or only those at the start and end removed.',
  [A.select('Mode', ['Remove all empty lines', 'Collapse runs of empty lines into one', 'Only at the start and end']), A.boolean('Treat whitespace-only lines as empty', true)],
  (t, mode, whitespace) => {
    const { lines, eol } = splitLines(t);
    const empty = l => whitespace ? !l.trim() : l === '';
    if (mode === 'Remove all empty lines') return lines.filter(l => !empty(l)).join(eol);
    if (mode === 'Collapse runs of empty lines into one') return lines.filter((l, i) => !(empty(l) && i > 0 && empty(lines[i - 1]))).join(eol);
    let start = 0, end = lines.length;
    while (start < end && empty(lines[start])) start++;
    while (end > start && empty(lines[end - 1])) end--;
    return lines.slice(start, end).join(eol);
  }, { text: true, aliases: ['blank lines', 'delete empty lines', 'remove blank lines', 'squeeze blank lines'] });
