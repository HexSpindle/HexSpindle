import { module } from './_cat.js';
import { minify } from './_jstok.js';

module('JavaScript Minify', 'Strips comments and whitespace from JavaScript (does not rename variables).', [],
  (t) => minify(t),
  { text: true }
);
