import { module } from './_cat.js';
import { A } from '../../core/registry.js';

module('Generate UUID', 'Generates a random (v4) UUID via the browser’s native crypto.randomUUID(). The input is ignored.', [A.number('Count', 1, 1, 1000), A.boolean('Uppercase', false)],
  (t, count, upper) => Array.from({ length: count }, () => { const u = crypto.randomUUID(); return upper ? u.toUpperCase() : u; }).join('\n'),
  { text: true, nondeterministic: true });
