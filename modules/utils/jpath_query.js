import { module } from './_cat.js';
import { A } from '../../core/registry.js';

function pyStr(n) {
  if (n === null) return 'None';
  if (n === true) return 'True';
  if (n === false) return 'False';
  return String(n);
}

function pyTypeName(x) {
  if (x === null) return 'NoneType';
  if (typeof x === 'boolean') return 'bool';
  if (typeof x === 'number') return Number.isInteger(x) ? 'int' : 'float';
  if (typeof x === 'string') return 'str';
  if (Array.isArray(x)) return 'list';
  if (typeof x === 'object') return 'dict';
  return typeof x;
}

function pyCompare(a, b) {
  if (typeof a === 'number' && typeof b === 'number') return a - b;
  if (typeof a === 'string' && typeof b === 'string') return a < b ? -1 : a > b ? 1 : 0;
  const sa = JSON.stringify(a), sb = JSON.stringify(b);
  return sa < sb ? -1 : sa > sb ? 1 : 0;
}

function pyCompareTyped(a, b) {
  const ta = pyTypeName(a), tb = pyTypeName(b);
  return ta !== tb ? (ta < tb ? -1 : 1) : pyCompare(a, b);
}

function isPlainObject(n) { return n !== null && typeof n === 'object' && !Array.isArray(n); }

function tokens(path) {
  const re = /\.\.|\[\s*'?([^\]']+?)'?\s*\]|\.?([^.[\]]+)/g;
  const toks = []; let m;
  path = path.replace(/^\$+/, '');
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
      const stack = [n], seen = [];
      while (stack.length) {
        const x = stack.shift();
        seen.push(x);
        if (isPlainObject(x)) stack.push(...Object.values(x));
        else if (Array.isArray(x)) stack.push(...x);
      }
      out.push(...seen);
    } else if (isPlainObject(n) && Object.prototype.hasOwnProperty.call(n, tok)) {
      out.push(n[tok]);
    } else if (Array.isArray(n) && /^-?\d+$/.test(tok)) {
      const idx = parseInt(tok, 10);
      if (-n.length <= idx && idx < n.length) out.push(n[((idx % n.length) + n.length) % n.length]);
    }
  }
  return out;
}

function dedupe(arr) {
  const seenKeys = [], out = [];
  for (const x of arr) { const k = JSON.stringify(x); if (!seenKeys.includes(k)) { seenKeys.push(k); out.push(x); } }
  return out;
}

module('JSON Query (jq-lite)', "Queries JSON with JSONPath syntax ($.a.b[0], $..name, $.items[*].id) and optional per-item filters/pipes (select(.x>1), length, keys, sort, unique, join(',')). Supported JSONPath syntax is the same subset as JPath expression (no filter/slice/script expressions); pipe stages are limited to select(.key OP value), length, keys, sort, unique, flatten and join(sep).",
  [A.string('Query', '$'), A.select('Output', ['Pretty JSON', 'One per line', 'Raw if single string/number'])],
  (t, path, outfmt) => {
    const data = JSON.parse(t);
    const stages = path.split('|').map(s => s.trim());
    let nodes = [data];
    for (let stage of stages) {
      stage = stage.trim();
      if (!stage || stage === '.') continue;
      const selectM = /^select\((.*)\)$/.exec(stage);
      if (selectM) {
        const cond = selectM[1].trim();
        const cm = /^\.(\w+)\s*(==|!=|>=|<=|>|<)\s*(.+)$/.exec(cond);
        if (!cm) throw new Error(`Unsupported select(): ${cond}`);
        const [, key, op, rawVal] = cm;
        let val;
        try { val = JSON.parse(rawVal); } catch { val = rawVal.trim().replace(/^['"]|['"]$/g, ''); }
        const ops = { '==': (a, b) => a === b, '!=': (a, b) => a !== b, '>': (a, b) => a > b, '<': (a, b) => a < b, '>=': (a, b) => a >= b, '<=': (a, b) => a <= b };
        const src = (nodes.length === 1 && Array.isArray(nodes[0])) ? nodes[0] : nodes;
        nodes = src.filter(n => isPlainObject(n) && Object.prototype.hasOwnProperty.call(n, key) && ops[op](n[key], val));
      } else if (stage === 'length') {
        nodes = nodes.map(n => Array.isArray(n) ? n.length : isPlainObject(n) ? Object.keys(n).length : typeof n === 'string' ? n.length : n);
      } else if (stage === 'keys') {
        nodes = nodes.map(n => isPlainObject(n) ? Object.keys(n).sort() : Array.from({ length: Array.isArray(n) ? n.length : (typeof n === 'string' ? n.length : 0) }, (_, i) => i));
      } else if (stage === 'sort') {
        nodes = (nodes.length === 1 && Array.isArray(nodes[0])) ? [[...nodes[0]].sort(pyCompare)] : [...nodes].sort(pyCompareTyped);
      } else if (stage === 'unique') {
        nodes = (nodes.length === 1 && Array.isArray(nodes[0])) ? [dedupe(nodes[0])] : dedupe(nodes);
      } else if (stage === 'flatten') {
        const flat = [];
        for (const n of nodes) { if (Array.isArray(n)) flat.push(...n); else flat.push(n); }
        nodes = flat;
      } else if (/^join\((.*)\)$/.test(stage)) {
        const sep = /^join\((.*)\)$/.exec(stage)[1].trim().replace(/^['"]|['"]$/g, '');
        const flat = (nodes.length === 1 && Array.isArray(nodes[0])) ? nodes[0] : nodes;
        return flat.map(pyStr).join(sep);
      } else {
        for (const tok of tokens(stage)) nodes = walk(nodes, tok);
      }
    }
    if (outfmt === 'One per line') return nodes.map(n => (isPlainObject(n) || Array.isArray(n)) ? JSON.stringify(n) : pyStr(n)).join('\n');
    if (outfmt === 'Raw if single string/number' && nodes.length === 1 && (nodes[0] === null || ['string', 'number', 'boolean'].includes(typeof nodes[0]))) return pyStr(nodes[0]);
    return JSON.stringify(nodes.length !== 1 ? nodes : nodes[0], null, 2);
  }, { text: true });
