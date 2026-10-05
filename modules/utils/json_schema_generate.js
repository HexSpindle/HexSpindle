import { module } from './_cat.js';

function infer(v) {
  if (typeof v === 'boolean') return { type: 'boolean' };
  if (typeof v === 'number') return { type: Number.isInteger(v) ? 'integer' : 'number' };
  if (typeof v === 'string') return { type: 'string' };
  if (v === null) return { type: 'null' };
  if (Array.isArray(v)) return v.length ? { type: 'array', items: infer(v[0]) } : { type: 'array' };
  if (v && typeof v === 'object') {
    const keys = Object.keys(v);
    const properties = {};
    for (const k of keys) properties[k] = infer(v[k]);
    return { type: 'object', properties, required: keys };
  }
  return {};
}

module('Generate JSON Schema', 'Infers a basic JSON Schema (types, nested objects/arrays, required properties) from an example JSON document.', [],
  (t) => {
    const obj = JSON.parse(t);
    const schema = { $schema: 'http://json-schema.org/draft-07/schema#', ...infer(obj) };
    return JSON.stringify(schema, null, 2);
  }, { text: true });
