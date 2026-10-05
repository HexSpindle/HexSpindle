import { module } from './_cat.js';
import { A } from '../../core/registry.js';

module('Sort', 'Sorts lines.', [A.select('Order', ['Alphabetical (case sensitive)', 'Alphabetical (case insensitive)', 'Numeric', 'Length', 'Reverse']), A.boolean('Reverse order', false)],
  (t, order, rev) => {
    let lines = t.split('\n');
    if (order === 'Alphabetical (case sensitive)') lines.sort();
    else if (order === 'Alphabetical (case insensitive)') lines.sort((a, b) => a.localeCompare(b, undefined, { sensitivity: 'base' }));
    else if (order === 'Numeric') lines.sort((a, b) => (parseFloat(a) || 0) - (parseFloat(b) || 0));
    else if (order === 'Length') lines.sort((a, b) => a.length - b.length);
    else lines.reverse();
    if (rev) lines.reverse();
    return lines.join('\n');
  }, { text: true });
