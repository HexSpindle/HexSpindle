import { module } from './_cat.js';
import { A } from '../../core/registry.js';

function parseCsv(t, delimiter) {
  const rows = [];
  let row = [], field = '', inQuotes = false;
  for (let i = 0; i < t.length; i++) {
    const c = t[i];
    if (inQuotes) {
      if (c === '"') { if (t[i + 1] === '"') { field += '"'; i++; } else inQuotes = false; }
      else field += c;
    } else if (c === '"') inQuotes = true;
    else if (c === delimiter) { row.push(field); field = ''; }
    else if (c === '\n' || c === '\r') { if (c === '\r' && t[i + 1] === '\n') i++; row.push(field); rows.push(row); row = []; field = ''; }
    else field += c;
  }
  if (field.length || row.length) { row.push(field); rows.push(row); }
  return rows.filter(r => r.length > 1 || r[0] !== '');
}

module('CSV to JSON', 'Converts a CSV table into a JSON array of objects (first row = headers).', [A.string('Cell delimiter', ','), A.select('Format', ['Array of objects', 'Array of arrays'])],
  (t, delimiter, fmt) => {
    const rows = parseCsv(t, delimiter);
    if (!rows.length) return '[]';
    if (fmt === 'Array of arrays') return JSON.stringify(rows, null, 2);
    const [header, ...body] = rows;
    return JSON.stringify(body.map(r => Object.fromEntries(header.map((h, i) => [h, r[i] ?? '']))), null, 2);
  }, { text: true });
