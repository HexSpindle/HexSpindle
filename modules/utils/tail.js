import { module } from './_cat.js';
import { A } from '../../core/registry.js';

module('Tail', 'Keeps the last N lines.', [A.number('Number of lines', 10, 0)], (t, n) => (n ? t.split('\n').slice(-n) : []).join('\n'), { text: true });
