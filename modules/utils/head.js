import { module } from './_cat.js';
import { A } from '../../core/registry.js';

module('Head', 'Keeps the first N lines.', [A.number('Number of lines', 10, 0)], (t, n) => t.split('\n').slice(0, n).join('\n'), { text: true });
