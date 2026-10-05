import { module } from './_cat.js';
import { A } from '../../core/registry.js';

module('Pad lines', 'Adds Length copies of Character to the start or end of each line.', [A.select('Position', ['Start', 'End']), A.number('Length', 5, 0), A.string('Character', ' ')],
  (t, pos, n, ch) => {
    const pad = pos === 'Start' ? (l => l.padStart(l.length + n, ch)) : (l => l.padEnd(l.length + n, ch));
    return t.split('\n').map(pad).join('\n');
  }, { text: true });
