import { module } from './_cat.js';
import { A } from '../../core/registry.js';

function csvField(v) {
  if (v === null || v === undefined) return '';
  if (typeof v === 'boolean') return v ? 'True' : 'False';
  if (typeof v === 'object') return JSON.stringify(v);
  return String(v);
}

function writeRow(fields, delimiter) {
  return fields.map(f => {
    const s = csvField(f);
    return /["\r\n]/.test(s) || s.includes(delimiter) ? '"' + s.replace(/"/g, '""') + '"' : s;
  }).join(delimiter);
}

module('JSON to CSV', 'Converts a JSON array of objects (or arrays) to CSV.',
  [A.string('Cell delimiter', ','), A.string('Row delimiter', '\\r\\n')], (t, cd, rd) => {
    let d = JSON.parse(t);
    if (!Array.isArray(d)) d = [d];
    rd = rd.replace(/\\r/g, '\r').replace(/\\n/g, '\n');
    const delimiter = cd.replace(/\\t/g, '\t') || ',';
    const lines = [];
    if (d.length && d[0] && typeof d[0] === 'object' && !Array.isArray(d[0])) {
      const keys = [];
      const seen = new Set();
      for (const r of d) for (const k of Object.keys(r)) if (!seen.has(k)) { seen.add(k); keys.push(k); }
      lines.push(writeRow(keys, delimiter));
      for (const r of d) lines.push(writeRow(keys.map(k => (k in r && (typeof r[k] === 'object' && r[k] !== null)) ? JSON.stringify(r[k]) : (k in r ? r[k] : '')), delimiter));
    } else {
      for (const r of d) lines.push(writeRow(Array.isArray(r) ? r : [r], delimiter));
    }
    return lines.length ? lines.join(rd) + rd : '';
  }, { text: true });
