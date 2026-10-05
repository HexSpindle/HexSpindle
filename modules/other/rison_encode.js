import { module } from './_cat.js';
import { parseJsonTyped, Flt, pyFloatRepr } from './_cat.js';

const SAFE = /^[A-Za-z_][A-Za-z0-9_.\/-]*$/;

function enc(v) {
  if (v === null) return '!n';
  if (typeof v === 'boolean') return v ? '!t' : '!f';
  if (v instanceof Flt) return pyFloatRepr(v.value);
  if (typeof v === 'number') return String(v);
  if (typeof v === 'string') {
    if (v === '') return "''";
    if (SAFE.test(v) && !['true', 'false', 'null'].includes(v)) return v;
    return "'" + v.replace(/!/g, '!!').replace(/'/g, "!'") + "'";
  }
  if (Array.isArray(v)) return '!(' + v.map(enc).join(',') + ')';
  if (v instanceof Map) {
    const entries = [...v.entries()].sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0));
    return '(' + entries.map(([k, x]) => `${SAFE.test(k) ? k : enc(k)}:${enc(x)}`).join(',') + ')';
  }
  throw new Error(`Cannot encode type ${v === undefined ? 'undefined' : typeof v}`);
}

module('Rison Encode', 'Encodes JSON as Rison (a compact, URL-safe alternative to JSON used by Kibana/Elasticsearch).', [],
  (t) => enc(parseJsonTyped(t)), { text: true });
