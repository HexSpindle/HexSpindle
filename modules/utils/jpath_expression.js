import { module } from './_cat.js';
import { A } from '../../core/registry.js';
import { delim } from '../../core/util.js';

function pyStr(n) {
  if (n === null) return 'None';
  if (n === true) return 'True';
  if (n === false) return 'False';
  return String(n);
}

function isPlainObject(n) { return n !== null && typeof n === 'object' && !Array.isArray(n); }

function tokenize(path) {
  const re = /\.\.|\[\s*'?([^\]']+?)'?\s*\]|\.?([^.[\]]+)/g;
  const toks = []; let m;
  while ((m = re.exec(path)) !== null) {
    toks.push(m[0] === '..' ? '..' : (m[1] !== undefined ? m[1] : m[2]));
    if (m[0].length === 0) re.lastIndex++;
  }
  return toks;
}

function walk(nodes, tok) {
  const out = [];
  for (const n of nodes) {
    if (tok === '*') {
      if (isPlainObject(n)) out.push(...Object.values(n));
      else if (Array.isArray(n)) out.push(...n);
    } else if (tok === '..') {
      const stack = [n];
      while (stack.length) {
        const x = stack.pop();
        out.push(x);
        if (isPlainObject(x)) stack.push(...Object.values(x));
        else if (Array.isArray(x)) stack.push(...x);
      }
    } else if (isPlainObject(n) && Object.prototype.hasOwnProperty.call(n, tok)) {
      out.push(n[tok]);
    } else if (Array.isArray(n) && /^-?\d+$/.test(tok)) {
      const idx = parseInt(tok, 10);
      if (-n.length <= idx && idx < n.length) out.push(n[((idx % n.length) + n.length) % n.length]);
    }
  }
  return out;
}

module('JPath expression', "Queries JSON with a simple JSONPath-style expression ($.a.b[0], $.items[*].name). Supported syntax: dot/bracket property access, numeric array indices (including negative), the [*] wildcard, and .. recursive descent - no filter expressions ([?(...)]), slices ([1:3]), or script expressions.",
  [A.string('Path', '$'), A.string('Result delimiter', '\\n')],
  (t, path, d) => {
    let nodes = [JSON.parse(t)];
    for (const tok of tokenize(path.replace(/^\$+/, ''))) nodes = walk(nodes, tok);
    return nodes.map(n => isPlainObject(n) || Array.isArray(n) ? JSON.stringify(n) : pyStr(n)).join(delim(d));
  }, { text: true });
