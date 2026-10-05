import { module } from './_cat.js';
import { snakeCase } from './_words.js';

module('To Snake case', 'Converts identifiers to snake_case.', [],
  (t) => snakeCase(t), { text: true });
