import { module } from './_cat.js';

module('Remove line numbers', 'Strips a leading line-number prefix from each line.', [], (t) => t.split('\n').map(l => l.replace(/^\s*\d+[:.)\s]\s*/, '')).join('\n'), { text: true });
