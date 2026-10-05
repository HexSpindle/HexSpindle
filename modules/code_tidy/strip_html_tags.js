import { module } from './_cat.js';

module('Strip HTML tags', 'Removes HTML tags, keeping the text content.', [],
  (t) => { const d = document.createElement('div'); d.innerHTML = t; return d.textContent || ''; }, { text: true });
