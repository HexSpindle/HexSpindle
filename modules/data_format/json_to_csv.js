import { module } from './_cat.js';
import { A } from '../../core/registry.js';

const unescape = s => String(s).replace(/\\r/g, '\r').replace(/\\n/g, '\n').replace(/\\t/g, '\t');

function flattenRow(value, prefix = '', out = {}) {
  if (value === null || value === undefined) {
    if (prefix) out[prefix] = '';
    return out;
  }

  // A top-level JSON array is split into rows before this function is called.
  // Nested arrays can therefore be flattened safely into indexed columns without
  // collapsing separate top-level records into 0.*, 1.*, 2.* on one CSV row.
  if (Array.isArray(value)) {
    if (!value.length) { if (prefix) out[prefix] = []; return out; }
    value.forEach((child, index) => {
      const next = prefix ? `${prefix}.${index}` : String(index);
      if (child && typeof child === 'object') flattenRow(child, next, out);
      else out[next] = child ?? '';
    });
    return out;
  }

  if (typeof value !== 'object') {
    if (prefix) out[prefix] = value;
    return out;
  }

  const entries = Object.entries(value);
  if (!entries.length) {
    if (prefix) out[prefix] = '{}';
    return out;
  }

  for (const [key, child] of entries) {
    const next = prefix ? `${prefix}.${key}` : key;
    if (child && typeof child === 'object') flattenRow(child, next, out);
    else out[next] = child ?? '';
  }
  return out;
}

function escapeCell(value, cellDelim, rowDelim) {
  let text;
  if (value === null || value === undefined) text = '';
  else if (typeof value === 'object') text = JSON.stringify(value);
  else text = String(value);
  const escaped = text.replace(/"/g, '""');
  return escaped.includes(cellDelim) || escaped.includes(rowDelim) || /[\r\n"]/.test(escaped)
    ? `"${escaped}"` : escaped;
}

function objectRowsToCsv(rows, cellDelim, rowDelim) {
  const flatRows = rows.map(row => flattenRow(row));
  const headers = [];
  const seen = new Set();
  for (const row of flatRows) {
    for (const key of Object.keys(row)) {
      if (!seen.has(key)) { seen.add(key); headers.push(key); }
    }
  }
  if (!headers.length) return '';
  const line = row => headers.map(h => escapeCell(row[h], cellDelim, rowDelim)).join(cellDelim);
  return headers.map(h => escapeCell(h, cellDelim, rowDelim)).join(cellDelim) + rowDelim +
    flatRows.map(line).join(rowDelim) + rowDelim;
}

module(
  'JSON to CSV',
  'Converts JSON to CSV. Each item in a top-level JSON array becomes one CSV row; nested objects and nested arrays are flattened into dot-notation/indexed columns.',
  [A.string('Cell delimiter', ','), A.string('Row delimiter', '\\r\\n')],
  (text, cd, rd) => {
    let input;
    try { input = JSON.parse(text); }
    catch (error) { throw new Error('Unable to parse JSON: ' + error.message); }

    const cellDelim = unescape(cd), rowDelim = unescape(rd);
    if (!cellDelim) throw new Error('Cell delimiter cannot be empty');
    if (!rowDelim) throw new Error('Row delimiter cannot be empty');

    if (Array.isArray(input) && input.every(row => Array.isArray(row))) {
      return input.map(row => row.map(v => escapeCell(v, cellDelim, rowDelim)).join(cellDelim)).join(rowDelim) + rowDelim;
    }

    if (Array.isArray(input)) {
      const rows = input.map(value => value && typeof value === 'object' && !Array.isArray(value) ? value : { value });
      return objectRowsToCsv(rows, cellDelim, rowDelim);
    }

    return objectRowsToCsv([input && typeof input === 'object' ? input : { value: input }], cellDelim, rowDelim);
  },
  { text: true }
);
