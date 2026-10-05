import { module } from './_cat.js';
import { A } from '../../core/registry.js';
import { delim } from '../../core/util.js';

function tokenize(path) {
  const re = /\.\.|\[\s*'?([^\]']+?)'?\s*\]|\.?([^.[\]]+)/g;
  const toks = []; let m;
  while ((m = re.exec(path)) !== null) {
    toks.push(m[0] === '..' ? '..' : (m[1] !== undefined ? m[1] : m[2]));
    if (m[0].length === 0) re.lastIndex++;
  }
  return toks;
}

function evaluate(toks, i, node, out) {
  if (i === toks.length) { out.push(node); return; }
  const tok = toks[i];
  const isContainer = node !== null && typeof node === 'object';
  if (tok === '..') {
    evaluate(toks, i + 1, node, out);
    if (isContainer) for (const k of Object.keys(node)) evaluate(toks, i, node[k], out);
  } else if (tok === '*') {
    if (isContainer) for (const k of Object.keys(node)) evaluate(toks, i + 1, node[k], out);
  } else if (isContainer && Object.prototype.hasOwnProperty.call(node, tok)) {
    evaluate(toks, i + 1, node[tok], out);
  }
}

module('JPath expression', "Queries JSON with a simple JSONPath-style expression ($.a.b[0], $.items[*].name); each result is output as JSON. Supported syntax: dot/bracket property access, numeric array indices, the [*] wildcard, and .. recursive descent - no filter expressions ([?(...)]), slices ([1:3]), or script expressions.",
  [A.string('Path', ''), A.string('Result delimiter', '\\n')],
  (t, path, d) => {
    let json;
    try { json = JSON.parse(t); } catch (e) { throw new Error(`Invalid input JSON: ${e.message}`); }
    if (!path) return '';
    const nodes = [];
    evaluate(tokenize(path.replace(/^\$+/, '')), 0, json, nodes);
    return nodes.map(n => JSON.stringify(n)).join(delim(d));
  }, { text: true });
