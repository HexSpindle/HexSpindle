import { module } from './_cat.js';
import { A } from '../../core/registry.js';

// The inverse of Query String to JSON: turns a JSON object (or array of objects) back into a URL query string.
const encode = (s, plus) => { const e = encodeURIComponent(String(s)); return plus ? e.replace(/%20/g, '+') : e; };

function toQuery(obj, plus) {
  const parts = [];
  for (const [key, value] of Object.entries(obj)) {
    // An array repeats the key, matching how Query String to JSON reads repeated parameters back into an array.
    for (const v of Array.isArray(value) ? value : [value]) {
      if (v !== null && typeof v === 'object') throw new Error(`"${key}" is a nested object; query strings hold only flat values (flatten it first)`);
      parts.push(`${encode(key, plus)}=${v === null || v === undefined ? '' : encode(v, plus)}`);
    }
  }
  return parts.join('&');
}

module('JSON to Query String',
  'Turns a JSON object into a URL query string (the inverse of Query String to JSON): {"a":1,"b":["x","y"]} becomes a=1&b=x&b=y, with values percent-encoded. '
  + 'An array value repeats its key; an array of objects at the top level becomes one query string per line.',
  [A.boolean('Encode spaces as + (instead of %20)', true)],
  (t, plus) => {
    const data = JSON.parse(t);
    if (Array.isArray(data)) return data.map(o => { if (!o || typeof o !== 'object' || Array.isArray(o)) throw new Error('Each item in the array must be an object'); return toQuery(o, plus); }).join('\n');
    if (!data || typeof data !== 'object') throw new Error('Expected a JSON object, or an array of objects');
    return toQuery(data, plus);
  }, { text: true, aliases: ['query string', 'url parameters', 'form data', 'urlencode', 'build query'] });
