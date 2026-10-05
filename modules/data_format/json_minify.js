import { module } from './_cat.js';

module('JSON Minify', 'Removes whitespace from JSON.', [], (t) => JSON.stringify(JSON.parse(t)), { text: true });
