// A small XML reader and writer with no DOM dependency, so the XML converters behave the same everywhere.
// It reads well-formed XML into { name, attrs, children } where children are nodes or text strings.

const ENTITIES = { lt: '<', gt: '>', amp: '&', quot: '"', apos: "'" };
export const decodeEntities = s => s.replace(/&(#x[0-9a-fA-F]+|#\d+|[a-zA-Z]+);/g, (whole, e) =>
  e[0] === '#' ? String.fromCodePoint(e[1] === 'x' || e[1] === 'X' ? parseInt(e.slice(2), 16) : parseInt(e.slice(1), 10)) : (ENTITIES[e] ?? whole));
export const escapeText = s => String(s).replace(/[&<>]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c]));
export const escapeAttr = s => escapeText(s).replace(/"/g, '&quot;');

export function parseXml(text) {
  let i = 0;
  const root = { name: '#document', attrs: {}, children: [] };
  const stack = [root];
  const fail = message => { throw new Error(`XML: ${message} (at character ${i + 1})`); };
  while (i < text.length) {
    const lt = text.indexOf('<', i);
    const top = stack[stack.length - 1];
    if (lt < 0) { if (text.slice(i).trim()) top.children.push(decodeEntities(text.slice(i))); break; }
    if (lt > i) { const chunk = text.slice(i, lt); if (chunk.trim() || stack.length > 1) top.children.push(decodeEntities(chunk)); }
    i = lt;
    if (text.startsWith('<!--', i)) { const end = text.indexOf('-->', i); if (end < 0) fail('unterminated comment'); i = end + 3; continue; }
    if (text.startsWith('<![CDATA[', i)) { const end = text.indexOf(']]>', i); if (end < 0) fail('unterminated CDATA section'); top.children.push(text.slice(i + 9, end)); i = end + 3; continue; }
    if (text.startsWith('<?', i)) { const end = text.indexOf('?>', i); if (end < 0) fail('unterminated processing instruction'); i = end + 2; continue; }
    if (text.startsWith('<!', i)) {
      // DOCTYPE, possibly with an internal subset in square brackets
      let depth = 0, j = i;
      for (; j < text.length; j++) { if (text[j] === '[') depth++; else if (text[j] === ']') depth--; else if (text[j] === '>' && depth <= 0) break; }
      if (j >= text.length) fail('unterminated declaration');
      i = j + 1; continue;
    }
    if (text[i + 1] === '/') {
      const end = text.indexOf('>', i);
      if (end < 0) fail('unterminated closing tag');
      const name = text.slice(i + 2, end).trim();
      if (stack.length < 2 || top.name !== name) fail(`closing tag </${name}> does not match <${top.name === '#document' ? '(nothing open)' : top.name}>`);
      stack.pop(); i = end + 1; continue;
    }
    const m = /^<([^\s/>]+)/.exec(text.slice(i, i + 300));
    if (!m) fail('malformed tag');
    const node = { name: m[1], attrs: {}, children: [] };
    i += m[0].length;
    for (;;) {
      while (/\s/.test(text[i] || '')) i++;
      if (i >= text.length) fail(`unterminated tag <${node.name}>`);
      if (text[i] === '>') { i++; top.children.push(node); stack.push(node); break; }
      if (text[i] === '/' && text[i + 1] === '>') { i += 2; top.children.push(node); break; }
      const a = /^([^\s=/>]+)\s*=\s*(?:"([^"]*)"|'([^']*)')/.exec(text.slice(i, i + 100000));
      if (!a) fail(`malformed attribute in <${node.name}>`);
      node.attrs[a[1]] = decodeEntities(a[2] ?? a[3]);
      i += a[0].length;
    }
  }
  if (stack.length > 1) fail(`<${stack[stack.length - 1].name}> is never closed`);
  const elements = root.children.filter(c => typeof c !== 'string');
  if (elements.length !== 1) fail(elements.length ? 'more than one root element' : 'no root element');
  return elements[0];
}
