import { module } from './_cat.js';

module('From HTML Entity', 'Converts HTML entities back to characters.', [],
  (t) => { const ta = document.createElement('textarea'); ta.innerHTML = t; return ta.value; }, { text: true });
