import { module } from './_cat.js';
import { kebabCase } from './_words.js';

module('To Kebab case', 'Converts identifiers to kebab-case.', [],
  (t) => kebabCase(t), { text: true });
