import { module } from './_cat.js';

module('Swap case', 'Inverts the case of every letter.', [],
  (t) => [...t].map(c => { const u = c.toUpperCase(); return c === u ? c.toLowerCase() : u; }).join(''), { text: true });
