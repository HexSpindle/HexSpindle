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

module('To Table', 'Renders delimited text as an ASCII, Markdown or HTML table.',
  [A.string('Cell delimiter', ','), A.boolean('First row is header', true), A.select('Format', ['ASCII', 'Markdown', 'HTML'])],
  (t, cd, header, fmt) => {
    cd = cd.replace(/\\t/g, '\t') || ',';
    const rows = t.split('\n').filter(l => l !== '').map(l => parseCsvLine(l, cd));
    if (!rows.length) return '';
    const w = Math.max(...rows.map(r => r.length));
    const padded = rows.map(r => [...r, ...Array(w - r.length).fill('')]);
    if (fmt === 'HTML') {
      const h = (r, tag) => '<tr>' + r.map(c => `<${tag}>${escapeHtml(c)}</${tag}>`).join('') + '</tr>';
      const body = header ? h(padded[0], 'th') + padded.slice(1).map(r => h(r, 'td')).join('') : padded.map(r => h(r, 'td')).join('');
      return new Html(`<table class="df-table">${body}</table>`);
    }
    const widths = Array.from({ length: w }, (_, i) => Math.max(...padded.map(r => r[i].length)));
    const line = r => '| ' + r.map((c, i) => c.padEnd(widths[i])).join(' | ') + ' |';
    if (fmt === 'Markdown') {
      const div = '| ' + widths.map(x => '-'.repeat(x)).join(' | ') + ' |';
      return [line(padded[0]), div, ...padded.slice(1).map(line)].join('\n') + '\n';
    }
    const sep = '+' + widths.map(x => '-'.repeat(x + 2)).join('+') + '+';
    const out = [sep];
    padded.forEach((r, i) => {
      out.push(line(r));
      if (i === 0 && header) out.push(sep);
    });
    out.push(sep);
    return out.join('\n') + '\n';
  }, { text: true });
