import { module } from './_cat.js';
import { A, Html } from '../../core/registry.js';

const escapeHtml = s => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

function inline(text) {
  text = escapeHtml(text);
  const codes = [];
  text = text.replace(/`([^`]+)`/g, (_, code) => { codes.push(code); return `\u0000${codes.length - 1}\u0000`; });
  text = text.replace(/!\[([^\]]*)\]\(([^)\s]+)(?:\s+"([^"]*)")?\)/g, (_, alt, src, title) => `<img alt="${alt}" src="${src}"${title ? ` title="${title}"` : ''}>`);
  text = text.replace(/\[([^\]]*)\]\(([^)\s]+)(?:\s+"([^"]*)")?\)/g, (_, label, href, title) => `<a href="${href}"${title ? ` title="${title}"` : ''}>${label}</a>`);
  text = text.replace(/\*\*([^*]+)\*\*|__([^_]+)__/g, (_, a, b) => `<strong>${a ?? b}</strong>`);
  text = text.replace(/\*([^*]+)\*|_([^_]+)_/g, (_, a, b) => `<em>${a ?? b}</em>`);
  text = text.replace(/\u0000(\d+)\u0000/g, (_, i) => `<code>${codes[+i]}</code>`);
  return text;
}

const isHr = l => /^ {0,3}([-*_])(?:[ \t]*\1){2,}[ \t]*$/.test(l);
const headingMatch = l => /^ {0,3}(#{1,6})\s+(.*?)\s*#*\s*$/.exec(l);
const fenceMatch = l => /^ {0,3}```(\S*)\s*$/.exec(l);
const bqMatch = l => /^ {0,3}>\s?(.*)$/.exec(l);
const ulMatch = l => /^( *)([-*+])\s+(.*)$/.exec(l);
const olMatch = l => /^( *)(\d+)\.\s+(.*)$/.exec(l);
const indentOf = l => /^ */.exec(l)[0].length;
const isTableSep = l => /^\s*\|?\s*:?-+:?\s*(\|\s*:?-+:?\s*)*\|?\s*$/.test(l) && l.includes('-');
const splitRow = l => { let s = l.trim(); if (s.startsWith('|')) s = s.slice(1); if (s.endsWith('|')) s = s.slice(0, -1); return s.split('|').map(c => c.trim()); };
const cellAlign = c => (c.startsWith(':') && c.endsWith(':')) ? 'center' : c.endsWith(':') ? 'right' : c.startsWith(':') ? 'left' : null;

function parseList(lines, i, end, indent, ordered) {
  const items = [];
  while (i < end) {
    const m = ordered ? olMatch(lines[i]) : ulMatch(lines[i]);
    if (!m || m[1].length !== indent) break;
    const itemIndent = indent + 4;
    const text = m[3];
    i++;
    const subLines = [];
    while (i < end) {
      const line = lines[i];
      if (!line.trim()) {
        if (i + 1 < end && lines[i + 1].trim() && indentOf(lines[i + 1]) >= itemIndent) { subLines.push(''); i++; continue; }
        break;
      }
      if (indentOf(line) < itemIndent) break;
      subLines.push(line.slice(itemIndent));
      i++;
    }
    const children = subLines.length ? parseBlocks(subLines, 0, subLines.length) : [];
    items.push({ text, children });
  }
  return [items, i];
}

function parseBlocks(lines, start, end) {
  const blocks = [];
  let i = start;
  while (i < end) {
    const line = lines[i];
    if (!line.trim()) { i++; continue; }

    const fence = fenceMatch(line);
    if (fence) {
      const lang = fence[1];
      let j = i + 1; const codeLines = [];
      while (j < end && !/^ {0,3}```\s*$/.test(lines[j])) { codeLines.push(lines[j]); j++; }
      blocks.push({ type: 'code', lang, text: codeLines.join('\n') });
      i = j + 1; continue;
    }
    if (isHr(line)) { blocks.push({ type: 'hr' }); i++; continue; }
    const h = headingMatch(line);
    if (h) { blocks.push({ type: 'heading', level: h[1].length, text: h[2] }); i++; continue; }
    const bq = bqMatch(line);
    if (bq) {
      let j = i; const inner = [];
      while (j < end && lines[j].trim() !== '') {
        const m = bqMatch(lines[j]);
        if (m) { inner.push(m[1]); j++; }
        else if (inner.length) { inner.push(lines[j]); j++; }
        else break;
      }
      blocks.push({ type: 'blockquote', blocks: parseBlocks(inner, 0, inner.length) });
      i = j; continue;
    }
    if (line.includes('|') && i + 1 < end && isTableSep(lines[i + 1])) {
      const header = splitRow(line);
      const align = splitRow(lines[i + 1]).map(cellAlign);
      let j = i + 2; const rows = [];
      while (j < end && lines[j].includes('|') && lines[j].trim()) { rows.push(splitRow(lines[j])); j++; }
      blocks.push({ type: 'table', header, align, rows });
      i = j; continue;
    }
    const ul = ulMatch(line), ol = !ul ? olMatch(line) : null;
    if (ul || ol) {
      const ordered = !!ol;
      const indent = (ul || ol)[1].length;
      const [items, j] = parseList(lines, i, end, indent, ordered);
      blocks.push({ type: 'list', ordered, items });
      i = j; continue;
    }
    let j = i; const para = [];
    while (j < end && lines[j].trim() && !isHr(lines[j]) && !headingMatch(lines[j]) && !fenceMatch(lines[j]) && !bqMatch(lines[j]) && !ulMatch(lines[j]) && !olMatch(lines[j])) {
      para.push(lines[j]); j++;
    }
    blocks.push({ type: 'p', text: para.join('\n') });
    i = j;
  }
  return blocks;
}

function renderList(block) {
  const tag = block.ordered ? 'ol' : 'ul';
  const items = block.items.map(it => {
    let inner = inline(it.text);
    if (it.children.length) inner += render(it.children);
    return `<li>${inner}</li>`;
  }).join('\n');
  return `<${tag}>\n${items}\n</${tag}>`;
}

function renderTable(block) {
  const alignAttr = a => a ? ` style="text-align: ${a};"` : '';
  const thead = `<thead>\n<tr>\n${block.header.map((c, i) => `<th${alignAttr(block.align[i])}>${inline(c)}</th>`).join('\n')}\n</tr>\n</thead>`;
  const tbody = `<tbody>\n${block.rows.map(r => `<tr>\n${r.map((c, i) => `<td${alignAttr(block.align[i])}>${inline(c)}</td>`).join('\n')}\n</tr>`).join('\n')}\n</tbody>`;
  return `<table>\n${thead}\n${tbody}\n</table>`;
}

function render(blocks) {
  return blocks.map(b => {
    if (b.type === 'heading') return `<h${b.level}>${inline(b.text)}</h${b.level}>`;
    if (b.type === 'hr') return '<hr />';
    if (b.type === 'code') return `<pre><code${b.lang ? ` class="language-${b.lang}"` : ''}>${escapeHtml(b.text)}\n</code></pre>`;
    if (b.type === 'blockquote') return `<blockquote>\n${render(b.blocks)}\n</blockquote>`;
    if (b.type === 'list') return renderList(b);
    if (b.type === 'table') return renderTable(b);
    return `<p>${inline(b.text)}</p>`;
  }).join('\n');
}

module('Render Markdown', 'Renders Markdown as formatted HTML.', [],
  (t) => {
    const lines = t.replace(/\r\n/g, '\n').split('\n');
    const html = render(parseBlocks(lines, 0, lines.length));
    return new Html(`<div style="line-height:1.6">${html}</div>`);
  }, { text: true });
