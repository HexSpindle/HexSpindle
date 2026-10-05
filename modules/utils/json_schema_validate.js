import { module } from './_cat.js';
import { A } from '../../core/registry.js';
import { delim } from '../../core/util.js';

function typeOf(data) {
  if (data === null) return 'null';
  if (Array.isArray(data)) return 'array';
  if (typeof data === 'boolean') return 'boolean';
  if (typeof data === 'number') return Number.isInteger(data) ? 'integer' : 'number';
  if (typeof data === 'string') return 'string';
  if (typeof data === 'object') return 'object';
  return typeof data;
}

function matchesType(data, x) {
  if (x === 'object') return data !== null && typeof data === 'object' && !Array.isArray(data);
  if (x === 'array') return Array.isArray(data);
  if (x === 'string') return typeof data === 'string';
  if (x === 'number') return typeof data === 'number';
  if (x === 'integer') return typeof data === 'number' && Number.isInteger(data);
  if (x === 'boolean') return typeof data === 'boolean';
  if (x === 'null') return data === null;
  return false;
}

function check(data, schema, path = '$') {
  const errs = [];
  const t = schema.type;
  if (t) {
    const types = Array.isArray(t) ? t : [t];
    if (!types.some(x => matchesType(data, x))) {
      errs.push(`${path}: expected type ${JSON.stringify(t)}, got ${typeOf(data)}`);
      return errs;
    }
  }
  if ('enum' in schema && !schema.enum.some(v => JSON.stringify(v) === JSON.stringify(data))) {
    errs.push(`${path}: ${JSON.stringify(data)} not in enum ${JSON.stringify(schema.enum)}`);
  }
  if (data !== null && typeof data === 'object' && !Array.isArray(data)) {
    for (const req of schema.required || []) if (!(req in data)) errs.push(`${path}: missing required property '${req}'`);
    const props = schema.properties || {};
    for (const k of Object.keys(data)) {
      if (k in props) errs.push(...check(data[k], props[k], `${path}.${k}`));
      else if (schema.additionalProperties === false) errs.push(`${path}.${k}: additional property not allowed`);
    }
  }
  if (Array.isArray(data)) {
    if (schema.items) data.forEach((v, i) => errs.push(...check(v, schema.items, `${path}[${i}]`)));
    if ('minItems' in schema && data.length < schema.minItems) errs.push(`${path}: has ${data.length} items, needs at least ${schema.minItems}`);
    if ('maxItems' in schema && data.length > schema.maxItems) errs.push(`${path}: has ${data.length} items, needs at most ${schema.maxItems}`);
  }
  if (typeof data === 'string') {
    if ('minLength' in schema && data.length < schema.minLength) errs.push(`${path}: length ${data.length} < minLength ${schema.minLength}`);
    if ('maxLength' in schema && data.length > schema.maxLength) errs.push(`${path}: length ${data.length} > maxLength ${schema.maxLength}`);
    if ('pattern' in schema && !new RegExp(schema.pattern).test(data)) errs.push(`${path}: does not match pattern ${JSON.stringify(schema.pattern)}`);
  }
  if (typeof data === 'number') {
    const checks = [['minimum', (a, b) => a < b, '<'], ['maximum', (a, b) => a > b, '>'], ['exclusiveMinimum', (a, b) => a <= b, '<='], ['exclusiveMaximum', (a, b) => a >= b, '>=']];
    for (const [k, op, msg] of checks) if (k in schema && op(data, schema[k])) errs.push(`${path}: ${data} ${msg} ${k} ${schema[k]}`);
  }
  return errs;
}

module('JSON Schema Validate', 'Validates JSON against a JSON Schema (subset: type, required, properties, items, enum, min/max length, min/max, pattern). Input is JSON<separator>SCHEMA.',
  [A.string('Separator', '\\n---\\n')],
  (t, sep) => {
    sep = delim(sep);
    if (!t.includes(sep)) throw new Error('Separator not found: provide JSON data, the separator, then the JSON schema');
    const idx = t.indexOf(sep);
    const data = JSON.parse(t.slice(0, idx)), schema = JSON.parse(t.slice(idx + sep.length));
    const errs = check(data, schema);
    return !errs.length ? 'Valid: no errors found.' : `Invalid: ${errs.length} error(s)\n` + errs.join('\n');
  }, { text: true });
