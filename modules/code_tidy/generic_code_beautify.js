import { module } from './_cat.js';
import { beautify } from './_jstok.js';

module('Generic Code Beautify', 'Applies brace-based indentation to C-style code (JS, JSON-like, Java, C#, ...).', [],
  (t) => beautify(t),
  { text: true }
);
