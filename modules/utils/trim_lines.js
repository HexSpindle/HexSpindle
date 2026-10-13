import { module } from './_cat.js';
import { A } from '../../core/registry.js';
import { splitLines } from './_lines.js';

const escapeClass = s => s.replace(/[\\\]^-]/g, '\\$&');

module('Trim lines',
  'Removes whitespace (or the characters you list) from the start and/or end of every line. Optionally also collapses runs of spaces and tabs inside each line to a single space.',
  [A.select('Trim', ['Both ends', 'Start', 'End']), A.string('Characters to trim (blank = whitespace)', ''), A.boolean('Collapse repeated spaces and tabs inside lines', false)],
  (t, where, chars, collapse) => {
    const { lines, eol } = splitLines(t);
    const set = chars ? `[${escapeClass(chars)}]+` : '[ \\t\\f\\v\\u00a0\\ufeff]+';
    const start = new RegExp(`^${set}`), end = new RegExp(`${set}$`);
    return lines.map(l => {
      if (where !== 'End') l = l.replace(start, '');
      if (where !== 'Start') l = l.replace(end, '');
      return collapse ? l.replace(/[ \t]{2,}|\t/g, ' ') : l;
    }).join(eol);
  }, { text: true, aliases: ['strip', 'strip whitespace', 'trim whitespace', 'collapse spaces'] });
