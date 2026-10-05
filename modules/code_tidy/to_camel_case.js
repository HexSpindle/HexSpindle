import { module } from './_cat.js';
import { A } from '../../core/registry.js';
import { camelCase } from './_words.js';

module('To Camel case', 'Converts identifiers to camelCase (or PascalCase).', [A.boolean('Upper camel case (PascalCase)', false)],
  (t, pascal) => {
    const c = camelCase(t);
    return pascal ? c.charAt(0).toUpperCase() + c.slice(1) : c;
  }, { text: true });
