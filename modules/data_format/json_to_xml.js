import { module } from './_cat.js';
import { A } from '../../core/registry.js';
import { escapeText, escapeAttr } from './_xml_lite.js';

const validName = name => /^[A-Za-z_:][\w.:-]*$/.test(name);

function element(name, value, indent, depth) {
  if (!validName(name)) throw new Error(`"${name}" cannot be used as an XML element name`);
  const pad = indent ? '\n' + indent.repeat(depth) : '';
  if (Array.isArray(value)) return value.map(v => element(name, v, indent, depth)).join('');
  if (value === null || value === undefined) return `${pad}<${name}/>`;
  if (typeof value !== 'object') return `${pad}<${name}>${escapeText(value)}</${name}>`;
  let attrs = '', inner = '', text = '';
  for (const [k, v] of Object.entries(value)) {
    if (k.startsWith('@')) { if (!validName(k.slice(1))) throw new Error(`"${k}" cannot be used as an XML attribute name`); attrs += ` ${k.slice(1)}="${escapeAttr(v ?? '')}"`; }
    else if (k === '#text') text = escapeText(v ?? '');
    else inner += element(k, v, indent, depth + 1);
  }
  if (!inner && !text) return `${pad}<${name}${attrs}/>`;
  return `${pad}<${name}${attrs}>${text}${inner}${inner && indent ? '\n' + indent.repeat(depth) : ''}</${name}>`;
}

module('JSON to XML',
  'Converts JSON to XML using the same convention as XML to JSON: "@name" keys become attributes, "#text" becomes element text, arrays become repeated elements. '
  + 'When the JSON is not an object with exactly one key, it is wrapped in the root element you name.',
  [A.string('Root element (used when the JSON has no single top-level key)', 'root'), A.boolean('Pretty print', true), A.boolean('Add XML declaration', false)],
  (t, rootName, pretty, declaration) => {
    const data = JSON.parse(t);
    const single = data && typeof data === 'object' && !Array.isArray(data) && Object.keys(data).length === 1 && !Object.keys(data)[0].startsWith('@') && !Array.isArray(Object.values(data)[0]);
    const [name, value] = single ? Object.entries(data)[0] : [rootName || 'root', Array.isArray(data) ? { item: data } : data];
    const xml = element(name, value, pretty ? '  ' : '', 0).replace(/^\n/, '');
    return (declaration ? '<?xml version="1.0" encoding="UTF-8"?>' + (pretty ? '\n' : '') : '') + xml;
  }, { text: true, aliases: ['json2xml'] });
