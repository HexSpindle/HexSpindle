import { module } from './_cat.js';
import { A } from '../../core/registry.js';

function indentNode(node, indent, level) {
  const kids = Array.from(node.childNodes);
  const hasElementChild = kids.some((k) => k.nodeType === 1);
  if (!hasElementChild) return;

  for (const k of kids) {
    if (k.nodeType === 3 && !k.data.trim()) node.removeChild(k);
  }
  const remaining = Array.from(node.childNodes);
  const doc = node.ownerDocument;
  const pad = indent.repeat(level + 1);
  const padEnd = indent.repeat(level);

  for (const k of remaining) node.removeChild(k);
  for (const k of remaining) {
    node.appendChild(doc.createTextNode('\n' + pad));
    node.appendChild(k);
  }
  node.appendChild(doc.createTextNode('\n' + padEnd));

  for (const k of remaining) {
    if (k.nodeType === 1) indentNode(k, indent, level + 1);
  }
}

module('XML Beautify', 'Indents and formats XML.', [A.string('Indent string', '    ')],
  (t, indent) => {
    indent = indent.replace(/\\t/g, '\t');
    const trimmed = t.trim();
    const doc = new DOMParser().parseFromString(trimmed, 'application/xml');
    const err = doc.querySelector('parsererror');
    if (err) throw new Error('Invalid XML: ' + err.textContent);

    const root = doc.documentElement;
    indentNode(root, indent, 0);

    const decl = /^<\?xml/.test(trimmed) ? '<?xml version="1.0" encoding="UTF-8"?>\n' : '';
    const serializer = new XMLSerializer();
    const parts = Array.from(doc.childNodes).map((n) => serializer.serializeToString(n));
    return decl + parts.join('\n');
  },
  { text: true }
);
