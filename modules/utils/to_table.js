import { module } from './_cat.js';
import { A, Html } from '../../core/registry.js';

function parseCsvLine(line, delim) {
  const row = [];
  let field = '', inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (inQuotes) {
      if (c === '"') { if (line[i + 1] === '"') { field += '"'; i++; } else inQuotes = false; }
      else field += c;
    } else if (c === '"' && field === '') inQuotes = true;
    else if (c === delim) { row.push(field); field = ''; }
    else field += c;
  }
  row.push(field);
  return row;
}

const escapeHtml = s => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

const CC_ESC = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#x27;', '`': '&#x60;', '\u0000': '\ue000' };
const CC_UNESC = { '&amp;': '&', '&lt;': '<', '&gt;': '>', '&quot;': '"', '&#x27;': "'", '&#x2F;': '/', '&#x60;': '`', '\ue000': '\u0000' };
const ccEscape = s => s.replace(/[&<>"'`\u0000]/g, c => CC_ESC[c]);
const ccUnescape = s => s.replace(/(&#?x?[a-z0-9]{2,4};|\ue000)/ig, m => CC_UNESC[m] || m);

function ccParseCSV(data, cellDelims, lineDelims) {
  let renderNext = false, inString = false, cell = '', line = [];
  const lines = [];
  if (data.length && data[0] === '\uFEFF') data = data.substr(1);
  for (let i = 0; i < data.length; i++) {
    const b = data[i], next = data[i + 1] || '';
    if (renderNext) { cell += b; renderNext = false; }
    else if (b === '"' && !inString) inString = true;
    else if (b === '"' && inString) { if (next === '"') renderNext = true; else inString = false; }
    else if (!inString && cellDelims.indexOf(b) >= 0) { line.push(cell); cell = ''; }
    else if (!inString && lineDelims.indexOf(b) >= 0) {
      line.push(cell); cell = ''; lines.push(line); line = [];
      if (lineDelims.indexOf(next) >= 0 && next !== b) i++;
    } else cell += b;
  }
  if (line.length) { line.push(cell); lines.push(line); }
  return lines;
}

function ccTable(rows, header, markdown) {
  const longest = [];
  rows.forEach(r => r.forEach((c, i) => { if (longest[i] === undefined || c.length > longest[i]) longest[i] = c.length; }));
  const row = r => '|' + r.map((c, i) => ' ' + c + ' '.repeat(longest[i] - c.length) + ' |').join('') + '\n';
  let out = '';
  if (markdown) {
    const first = rows.shift();
    out += row(first) + '|' + first.map((c, i) => ' ' + '-'.repeat(longest[i]) + ' |').join('') + '\n';
  } else {
    const border = '+' + longest.map(l => '-'.repeat(l + 2) + '+').join('') + '\n';
    out += border;
    if (header) out += row(rows.shift()) + border;
    rows.forEach(r => { out += row(r); });
    return out + border;
  }
  rows.forEach(r => { out += row(r); });
  return out;
}

module('To Table', 'Renders delimited text as an ASCII, Markdown or HTML table.',
  [A.string('Cell delimiter', ','), A.boolean('First row is header', false), A.select('Format', ['ASCII', 'Markdown', 'HTML']),
    A.string('Row delimiters', '\\r\\n')],
  (t, cd, header, fmt, rd = '\\r\\n') => {
    cd = cd.replace(/\\t/g, '\t') || ',';
    if (fmt !== 'HTML') {
      const rowDelims = rd.replace(/\\n/g, '\n').replace(/\\r/g, '\r').replace(/\\t/g, '\t');
      const data = ccParseCSV(ccEscape(t), cd.split(''), rowDelims.split(''));
      return data.length ? ccUnescape(ccTable(data, header, fmt === 'Markdown')) : '';
    }
    const rows = t.split('\n').filter(l => l !== '').map(l => parseCsvLine(l, cd));
    if (!rows.length) return '';
    const w = Math.max(...rows.map(r => r.length));
    const padded = rows.map(r => [...r, ...Array(w - r.length).fill('')]);
    const h = (r, tag) => '<tr>' + r.map(c => `<${tag}>${escapeHtml(c)}</${tag}>`).join('') + '</tr>';
    const body = header ? h(padded[0], 'th') + padded.slice(1).map(r => h(r, 'td')).join('') : padded.map(r => h(r, 'td')).join('');
    return new Html(`<table class="df-table">${body}</table>`);
  }, { text: true });
