import { module } from './_cat.js';
import { A } from '../../core/registry.js';

const ROW_DELIMS = ['\r', '\n'];

function parseCsv(data, cellDelims) {
  const lines = [];
  let cell = '', line = [], inString = false, renderNext = false;
  if (data.length && data[0] === '﻿') data = data.slice(1);
  for (let i = 0; i < data.length; i++) {
    const b = data[i], next = data[i + 1] || '';
    if (renderNext) { cell += b; renderNext = false; }
    else if (b === '"' && !inString) inString = true;
    else if (b === '"' && inString) { if (next === '"') renderNext = true; else inString = false; }
    else if (!inString && cellDelims.includes(b)) { line.push(cell); cell = ''; }
    else if (!inString && ROW_DELIMS.includes(b)) {
      line.push(cell); cell = ''; lines.push(line); line = [];
      if (ROW_DELIMS.includes(next) && next !== b) i++;
    } else cell += b;
  }
  if (line.length) { line.push(cell); lines.push(line); }
  return lines;
}

module('CSV to JSON', 'Converts a CSV table into a JSON array of objects (first row = headers).', [A.string('Cell delimiter', ','), A.select('Format', ['Array of objects', 'Array of arrays'])],
  (t, delimiter, fmt) => {
    const rows = parseCsv(t, delimiter.split(''));
    if (fmt === 'Array of arrays') return JSON.stringify(rows, null, 4);
    const [header = [], ...body] = rows;
    return JSON.stringify(body.map(r => {
      const obj = {};
      header.forEach((h, i) => { obj[h] = r[i]; });
      return obj;
    }), null, 4);
  }, { text: true });
