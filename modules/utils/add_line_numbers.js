import { module } from './_cat.js';

module('Add line numbers', 'Prefixes each line with its line number.', [], (t) => t.split('\n').map((l, i) => `${i + 1} ${l}`).join('\n'), { text: true });
