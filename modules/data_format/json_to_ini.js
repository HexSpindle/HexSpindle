import { module } from './_cat.js';

const value = v => {
  const s = v === null ? '' : String(v);
  // Quote anything a reader would otherwise trim or mistake for a comment.
  return /^\s|\s$|[;#"]|^$/.test(s) && s !== '' ? `"${s.replace(/"/g, '\\"')}"` : s;
};

module('JSON to INI',
  'Converts a JSON object to INI. Top-level values are written first, each nested object becomes a [section], deeper objects become [section.subsection], and arrays repeat their key once per item.',
  [],
  (t) => {
    const data = JSON.parse(t);
    if (!data || typeof data !== 'object' || Array.isArray(data)) throw new Error('The top level must be a JSON object');
    const out = [];
    (function emit(obj, path) {
      const plain = Object.entries(obj).filter(([, v]) => v === null || typeof v !== 'object' || Array.isArray(v));
      if (path.length) out.push(`${out.length ? '\n' : ''}[${path.join('.')}]`);
      for (const [k, v] of plain) for (const item of Array.isArray(v) ? v : [v]) {
        if (item !== null && typeof item === 'object') throw new Error(`"${[...path, k].join('.')}" is an array of objects, which INI cannot express`);
        out.push(`${k}=${value(item)}`);
      }
      for (const [k, v] of Object.entries(obj)) if (v !== null && typeof v === 'object' && !Array.isArray(v)) emit(v, [...path, k]);
    })(data, []);
    return out.join('\n') + '\n';
  }, { text: true, aliases: ['json2ini'] });
