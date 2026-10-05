import { module } from './_cat.js';

module('Remove line numbers', 'Strips a leading line-number prefix from each line.', [], (t) => t.replace(/^[ \t]{0,5}\d+[\s:|\-,.)\]]/gm, ''), { text: true });
