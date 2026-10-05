import { module } from './_cat.js';

module('Remove ANSI Escape Codes', 'Strips ANSI/VT100 terminal escape sequences (colour codes, cursor movement) from text.', [],
  (t) => t.replace(/\x1b\[[0-9;?]*[a-zA-Z]|\x1b\][^\x07]*\x07|\x1b[@-Z\\-_]/g, ''), { text: true });
