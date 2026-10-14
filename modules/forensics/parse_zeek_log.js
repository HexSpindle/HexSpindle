import { module } from './_cat.js';
import { A } from '../../core/registry.js';

// Zeek TSV logs carry their schema in #fields / #types header lines and use a configurable separator (#separator).
const typed = (value, type, unset, empty) => {
  if (value === unset) return null;
  if (value === empty) return [];
  if (/^(count|int|port)$/.test(type)) return Number.isSafeInteger(+value) ? +value : value;
  if (/^(double|interval|time)$/.test(type)) return value === '' ? value : +value;
  if (type === 'bool') return value === 'T' ? true : value === 'F' ? false : value;
  if (type.startsWith('set[') || type.startsWith('vector[')) return value === empty ? [] : value.split(',');
  return value;
};

export function parseZeekTsv(text) {
  const meta = { separator: '\t' };
  const rows = [];
  let fields = null, types = null;
  for (const raw of text.split(/\r?\n/)) {
    if (!raw) continue;
    if (raw[0] === '#') {
      const sep = /^#separator (.+)$/.exec(raw);
      if (sep) { meta.separator = sep[1].startsWith('\\x') ? String.fromCharCode(parseInt(sep[1].slice(2), 16)) : sep[1]; continue; }
      const m = /^#(\w+)(?:\t| )(.*)$/.exec(raw) || /^#(path|open|close)$/.exec(raw);
      if (!m) continue;
      const [key, rest] = [m[1], m[2] ?? ''];
      if (key === 'fields') fields = rest.split(meta.separator);
      else if (key === 'types') types = rest.split(meta.separator);
      else if (key === 'set_separator' || key === 'empty_field' || key === 'unset_field' || key === 'path') meta[key] = rest;
      continue;
    }
    if (!fields) throw new Error('No #fields header found; this is not a Zeek TSV log');
    const values = raw.split(meta.separator);
    const row = {};
    fields.forEach((f, i) => row[f] = typed(values[i] ?? '', (types && types[i]) || 'string', meta.unset_field ?? '-', meta.empty_field ?? '(empty)'));
    rows.push(row);
  }
  return { path: meta.path, rows };
}

module('Parse Zeek Log',
  'Parses a Zeek (Bro) TSV log (conn.log, dns.log, http.log, ssl.log, notice.log and the rest) into JSON, using the #fields and #types headers to name and type every column. '
  + 'The #separator, set and empty-field markers are honoured, and - / (empty) become null and []. Works on logs straight from a Zeek sensor.',
  [A.boolean('Include the log path and field names', false)],
  (t, meta) => {
    const { path, rows } = parseZeekTsv(t);
    if (!rows.length) throw new Error('No data rows in the Zeek log');
    return JSON.stringify(meta ? { path, count: rows.length, rows } : (rows.length === 1 ? rows[0] : rows), null, 2);
  }, { text: true, aliases: ['zeek', 'bro', 'conn.log', 'nsm'] });
