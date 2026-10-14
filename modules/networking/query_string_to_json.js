import { module } from './_cat.js';
import { A } from '../../core/registry.js';
import { parseQuery } from './_http_parts.js';

module('Query String to JSON',
  'Turns a URL query string or form body (a=1&b=two+words&b=%C3%A9) into JSON, decoding percent-escapes. A full URL can be given: only the part after "?" is used. '
  + 'A parameter that repeats becomes an array; with several lines of input, each line becomes one object in a list.',
  [A.boolean('Decode + as a space', true)],
  (t, plus) => {
    const one = line => { const q = line.indexOf('?'); return parseQuery((q >= 0 ? line.slice(q + 1) : line).split('#')[0].trim(), plus); };
    const lines = t.split(/\r?\n/).filter(l => l.trim());
    return JSON.stringify(lines.length === 1 ? one(lines[0]) : lines.map(one), null, 2);
  }, { text: true, aliases: ['query string', 'url parameters', 'form data', 'urlencoded'] });
