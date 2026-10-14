import { module } from './_cat.js';
import { A } from '../../core/registry.js';
import { parseXml } from './_xml_lite.js';

const scalar = (s, convert) => {
  if (!convert) return s;
  const t = s.trim();
  if (t === 'true') return true;
  if (t === 'false') return false;
  if (t === 'null') return null;
  return /^-?(?:0|[1-9]\d{0,14})(?:\.\d+)?$/.test(t) ? Number(t) : s;
};

// Attributes become "@name", text beside attributes or child elements becomes "#text", repeated children become arrays.
function convert(node, attrs, types) {
  const out = {};
  if (attrs) for (const [k, v] of Object.entries(node.attrs)) out[`@${k}`] = scalar(v, types);
  const text = node.children.filter(c => typeof c === 'string').join('');
  const elements = node.children.filter(c => typeof c !== 'string');
  for (const child of elements) {
    const value = convert(child, attrs, types);
    if (!(child.name in out)) out[child.name] = value;
    else if (Array.isArray(out[child.name])) out[child.name].push(value);
    else out[child.name] = [out[child.name], value];
  }
  if (!elements.length && !Object.keys(out).length) return scalar(text.trim() ? text : '', types);
  if (text.trim()) out['#text'] = scalar(text.trim(), types);
  return out;
}

module('XML to JSON',
  'Converts XML to JSON. Elements become keys under the root element\'s name, attributes become "@name" keys, repeated elements become arrays, '
  + 'and text that sits beside attributes or child elements becomes "#text". JSON to XML reverses the same convention.',
  [A.boolean('Include attributes', true), A.boolean('Convert numbers, true, false and null', false)],
  (t, attrs, types) => { const root = parseXml(t); return JSON.stringify({ [root.name]: convert(root, attrs, types) }, null, 2); }, { text: true, aliases: ['xml2json'] });
