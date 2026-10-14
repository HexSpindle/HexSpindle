import { module } from './_cat.js';
import { A } from '../../core/registry.js';

module('JSON Flatten',
  'Flattens nested JSON into a single object whose keys are paths, for example {"a":{"b":[1,2]}} becomes {"a.b[0]":1,"a.b[1]":2}. '
  + 'Useful for diffing, grepping or loading nested data into a table. Empty objects and arrays are kept as values. JSON Unflatten reverses it.',
  [A.string('Separator', '.'), A.select('Array indexes', ['Brackets: a[0]', 'Dotted: a.0']), A.select('Output', ['JSON object', 'key = value lines'])],
  (t, sep, style, output) => {
    if (!sep) throw new Error('Separator must not be empty');
    const brackets = style !== 'Dotted: a.0', flat = {};
    (function walk(v, path) {
      if (v !== null && typeof v === 'object' && Object.keys(v).length) {
        for (const [k, child] of Object.entries(v)) walk(child, Array.isArray(v) ? (brackets ? `${path}[${k}]` : path ? `${path}${sep}${k}` : k) : path ? `${path}${sep}${k}` : k);
      } else flat[path] = v;
    })(JSON.parse(t), '');
    return output === 'key = value lines' ? Object.entries(flat).map(([k, v]) => `${k} = ${typeof v === 'string' ? v : JSON.stringify(v)}`).join('\n') : JSON.stringify(flat, null, 2);
  }, { text: true, aliases: ['flatten', 'dot notation', 'json paths'] });
