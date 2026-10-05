import { module } from './_cat.js';
import { A } from '../../core/registry.js';

function tokenize(src) {
  const toks = [];
  let i = 0;
  const n = src.length;
  const isDigit = c => c >= '0' && c <= '9';
  const isNameStart = c => /[A-Za-z_]/.test(c);
  const isNameChar = c => /[A-Za-z0-9_]/.test(c);
  const TWO_CHAR = ['~>', ':=', '..', '!=', '<=', '>=', '**'];

  while (i < n) {
    const c = src[i];
    if (/\s/.test(c)) { i++; continue; }
    if (c === '/' && src[i + 1] === '*') {
      const end = src.indexOf('*/', i + 2);
      i = end === -1 ? n : end + 2;
      continue;
    }
    if (c === '"' || c === "'") {
      let j = i + 1, s = '';
      while (j < n && src[j] !== c) {
        if (src[j] === '\\') { s += unescapeChar(src, j); j += escapeLen(src, j); } else { s += src[j]; j++; }
      }
      if (j >= n) throw new Error('Unterminated string literal');
      toks.push({ t: 'str', v: s }); i = j + 1; continue;
    }
    if (c === '`') {
      let j = i + 1, s = '';
      while (j < n && src[j] !== '`') { s += src[j]; j++; }
      if (j >= n) throw new Error('Unterminated quoted name');
      toks.push({ t: 'name', v: s }); i = j + 1; continue;
    }
    if (isDigit(c) || (c === '.' && isDigit(src[i + 1] || ''))) {
      let j = i;
      while (j < n && isDigit(src[j])) j++;
      if (src[j] === '.' && isDigit(src[j + 1] || '')) { j++; while (j < n && isDigit(src[j])) j++; }
      if (src[j] === 'e' || src[j] === 'E') { let k = j + 1; if (src[k] === '+' || src[k] === '-') k++; if (isDigit(src[k])) { j = k; while (j < n && isDigit(src[j])) j++; } }
      toks.push({ t: 'num', v: Number(src.slice(i, j)) }); i = j; continue;
    }
    if (c === '$') {
      if (src[i + 1] === '$') { toks.push({ t: 'var', v: '$$' }); i += 2; continue; }
      let j = i + 1, s = '';
      while (j < n && isNameChar(src[j])) { s += src[j]; j++; }
      toks.push({ t: 'var', v: s }); i = j; continue;
    }
    if (isNameStart(c)) {
      let j = i;
      while (j < n && isNameChar(src[j])) j++;
      toks.push({ t: 'name', v: src.slice(i, j) }); i = j; continue;
    }
    const two = src.slice(i, i + 2);
    if (TWO_CHAR.includes(two)) { toks.push({ t: 'op', v: two }); i += 2; continue; }
    if ('.[]{}(),:;?&+-*/%=<>@#^|~!'.includes(c)) { toks.push({ t: 'op', v: c }); i++; continue; }
    throw new Error(`Unexpected character '${c}' at position ${i}`);
  }
  toks.push({ t: 'end' });
  return toks;
}

function escapeLen(src, j) {
  return src[j + 1] === 'u' ? 6 : 2;
}
function unescapeChar(src, j) {
  const c = src[j + 1];
  const map = { n: '\n', t: '\t', r: '\r', b: '\b', f: '\f', '"': '"', "'": "'", '\\': '\\', '/': '/' };
  if (c === 'u') return String.fromCharCode(parseInt(src.slice(j + 2, j + 6), 16));
  return map[c] !== undefined ? map[c] : c;
}

const BIN_BP = { or: 10, and: 20, in: 30, '=': 40, '!=': 40, '<': 40, '<=': 40, '>': 40, '>=': 40, '..': 50, '+': 60, '-': 60, '*': 70, '/': 70, '%': 70, '&': 80, '~>': 90 };
const UNSUPPORTED_OPS = { '@': 'context binding (@)', '#': 'positional binding (#)', '%': 'parent-context reference (%, as a standalone operator)', '^': 'the sort operator (^(...))', '|': 'the transform operator (|...|)' };

function parse(src) {
  const toks = tokenize(src);
  let pos = 0;
  const peek = () => toks[pos];
  const next = () => toks[pos++];
  const expectOp = v => { const t = next(); if (!(t.t === 'op' && t.v === v)) throw new Error(`Expected '${v}'`); };

  function parseExpr(minBp) {
    let left = parseUnary();
    for (;;) {
      const t = peek();
      let opName = null;
      if (t.t === 'op' && BIN_BP[t.v] !== undefined) opName = t.v;
      else if (t.t === 'name' && (t.v === 'and' || t.v === 'or' || t.v === 'in')) opName = t.v;
      if (opName === null) break;
      const bp = BIN_BP[opName];
      if (bp < minBp) break;
      next();
      if (opName === '~>') {
        const call = parseUnary();
        if (call.type !== 'call') throw new Error("'~>' must be followed by a $function(...) call");
        left = { type: 'chain', left, call };
        continue;
      }
      const right = parseExpr(bp + 1);
      left = { type: 'binary', op: opName, left, right };
    }
    if (minBp <= 1 && peek().t === 'op' && peek().v === '?') {
      next();
      const thenE = parseExpr(0);
      let elseE = null;
      if (peek().t === 'op' && peek().v === ':') { next(); elseE = parseExpr(0); }
      left = { type: 'ternary', cond: left, then: thenE, else: elseE };
    }
    return left;
  }

  function parseUnary() {
    const t = peek();
    if (t.t === 'op' && t.v === '-') { next(); return { type: 'unary', op: '-', expr: parseUnary() }; }
    return parsePostfix(parsePrimary());
  }

  function parsePostfix(expr) {
    for (;;) {
      const t = peek();
      if (t.t === 'op' && t.v === '.') {
        next();
        const nt = peek();
        if (nt.t === 'op' && nt.v === '**') { next(); expr = { type: 'descendant', of: expr }; continue; }
        if (nt.t === 'op' && nt.v === '*') { next(); expr = { type: 'wildcard', of: expr }; continue; }
        if (nt.t === 'op' && nt.v === '{') { continue; } // handled by the '{' branch below on next loop
        if (nt.t === 'name' || nt.t === 'str') { next(); expr = { type: 'field', name: nt.v, of: expr }; continue; }
        if (nt.t === 'var') { // e.g. a.$func() is not real JSONata; be permissive and treat as call target
          expr = { type: 'field', name: '', of: expr };
          continue;
        }
        throw new Error('Expected a field name after .');
      }
      if (t.t === 'op' && t.v === '[') {
        next();
        if (peek().t === 'op' && peek().v === ']') { next(); expr = { type: 'singletonArray', of: expr }; continue; }
        const pred = parseExpr(0);
        expectOp(']');
        if (expr.type === 'field' || expr.type === 'wildcard' || expr.type === 'descendant') {
          expr = { ...expr, preds: [...(expr.preds || []), pred] };
        } else {
          expr = { type: 'predicate', of: expr, pred };
        }
        continue;
      }
      if (t.t === 'op' && t.v === '{') {
        next();
        const pairs = parseObjectPairs();
        expr = { type: 'objectConstruct', of: expr, pairs };
        continue;
      }
      if (t.t === 'op' && t.v === '(' && expr.type === 'var') {
        next();
        const args = [];
        if (!(peek().t === 'op' && peek().v === ')')) {
          args.push(parseExpr(0));
          while (peek().t === 'op' && peek().v === ',') { next(); args.push(parseExpr(0)); }
        }
        expectOp(')');
        expr = { type: 'call', name: expr.name, args };
        continue;
      }
      break;
    }
    return expr;
  }

  function parseObjectPairs() {
    const pairs = [];
    if (peek().t === 'op' && peek().v === '}') { next(); return pairs; }
    for (;;) {
      const key = parseExpr(0);
      expectOp(':');
      const val = parseExpr(0);
      pairs.push([key, val]);
      if (peek().t === 'op' && peek().v === ',') { next(); continue; }
      break;
    }
    expectOp('}');
    return pairs;
  }

  function parsePrimary() {
    const t = peek();
    if (t.t === 'num') { next(); return { type: 'lit', value: t.v }; }
    if (t.t === 'str') { next(); return { type: 'lit', value: t.v }; }
    if (t.t === 'name') {
      if (t.v === 'true') { next(); return { type: 'lit', value: true }; }
      if (t.v === 'false') { next(); return { type: 'lit', value: false }; }
      if (t.v === 'null') { next(); return { type: 'lit', value: null }; }
      if (t.v === 'function') throw new Error('Function literals (function($x){...}) are not supported by this JSONata subset');
      next();
      return { type: 'field', name: t.v, of: { type: 'context' } };
    }
    if (t.t === 'var') {
      next();
      if (t.v === '$$') return { type: 'root' };
      if (t.v === '') return { type: 'context' };
      return { type: 'var', name: t.v };
    }
    if (t.t === 'op') {
      if (t.v === '**') { next(); return { type: 'descendant', of: { type: 'context' } }; }
      if (t.v === '*') { next(); return { type: 'wildcard', of: { type: 'context' } }; }
      if (t.v === '(') {
        next();
        const stmts = [parseStatement()];
        while (peek().t === 'op' && peek().v === ';') { next(); if (peek().t === 'op' && peek().v === ')') break; stmts.push(parseStatement()); }
        expectOp(')');
        return { type: 'block', stmts };
      }
      if (t.v === '[') {
        next();
        const items = [];
        if (!(peek().t === 'op' && peek().v === ']')) {
          items.push(parseExpr(0));
          while (peek().t === 'op' && peek().v === ',') { next(); items.push(parseExpr(0)); }
        }
        expectOp(']');
        return { type: 'array', items };
      }
      if (t.v === '{') {
        next();
        const pairs = parseObjectPairs();
        return { type: 'objectConstruct', of: { type: 'context' }, pairs };
      }
      if (t.v === '&' ) { /* fallthrough to error below */ }
      if (UNSUPPORTED_OPS[t.v]) throw new Error(`Unsupported JSONata syntax: ${UNSUPPORTED_OPS[t.v]}`);
    }
    throw new Error(`Unexpected token: ${JSON.stringify(t)}`);
  }

  function parseStatement() {
    if (peek().t === 'var' && toks[pos + 1] && toks[pos + 1].t === 'op' && toks[pos + 1].v === ':=') {
      const name = next().v;
      next(); // ':='
      const expr = parseExpr(0);
      return { type: 'assign', name, expr };
    }
    return parseExpr(0);
  }

  const result = parseExpr(0);
  if (peek().t !== 'end') throw new Error(`Unexpected trailing input near '${JSON.stringify(peek())}'`);
  return result;
}


function isPlainObject(x) { return x !== null && typeof x === 'object' && !Array.isArray(x); }

function toBool(v) {
  if (v === undefined || v === null) return false;
  if (typeof v === 'boolean') return v;
  if (typeof v === 'number') return v !== 0;
  if (typeof v === 'string') return v.length > 0;
  if (Array.isArray(v)) return v.some(toBool);
  if (typeof v === 'object') return Object.keys(v).length > 0;
  return Boolean(v);
}

function deepEqual(a, b) {
  if (a === b) return true;
  if (typeof a !== typeof b) return false;
  if (Array.isArray(a) || Array.isArray(b)) {
    if (!Array.isArray(a) || !Array.isArray(b) || a.length !== b.length) return false;
    return a.every((x, i) => deepEqual(x, b[i]));
  }
  if (a && b && typeof a === 'object') {
    const ka = Object.keys(a), kb = Object.keys(b);
    if (ka.length !== kb.length) return false;
    return ka.every(k => Object.prototype.hasOwnProperty.call(b, k) && deepEqual(a[k], b[k]));
  }
  return false;
}

function collapse(out) {
  if (out.length === 0) return undefined;
  if (out.length === 1) return out[0];
  return out;
}

function mapStep(current, fn, bypassWhenSingle) {
  if (current === undefined) return undefined;
  const wasArray = Array.isArray(current);
  if (!wasArray && bypassWhenSingle) return fn(current);
  const items = wasArray ? current : [current];
  const out = [];
  for (const item of items) {
    const r = fn(item);
    if (r === undefined) continue;
    if (Array.isArray(r)) out.push(...r); else out.push(r);
  }
  return collapse(out);
}

function valuesOf(item) {
  if (Array.isArray(item)) return item.slice();
  if (isPlainObject(item)) return Object.values(item);
  return [];
}

function collectDescendants(value, out) {
  if (Array.isArray(value)) {
    for (const v of value) { out.push(v); collectDescendants(v, out); }
  } else if (isPlainObject(value)) {
    for (const k of Object.keys(value)) { out.push(value[k]); collectDescendants(value[k], out); }
  }
}

function applyPredicate(current, predAst, evalFn) {
  if (current === undefined) return undefined;
  const wasArray = Array.isArray(current);
  const items = wasArray ? current : [current];
  const length = items.length;
  const out = [];
  for (let posIdx = 0; posIdx < length; posIdx++) {
    const item = items[posIdx];
    const pv = evalFn(predAst, item);
    if (pv === undefined) continue;
    if (typeof pv === 'number') {
      const norm = pv < 0 ? length + pv : pv;
      if (norm === posIdx) out.push(item);
    } else if (Array.isArray(pv) && pv.length && pv.every(x => typeof x === 'number')) {
      const normSet = pv.map(x => (x < 0 ? length + x : x));
      if (normSet.includes(posIdx)) out.push(item);
    } else if (toBool(pv)) out.push(item);
  }
  return collapse(out);
}

function applyLocalPreds(value, preds, focus, scope) {
  if (!preds) return value;
  for (const predAst of preds) value = applyPredicate(value, predAst, (p, item) => evaluate(p, item, scope));
  return value;
}

function toConcatStr(v) {
  if (v === undefined) return '';
  if (typeof v === 'string') return v;
  return JSON.stringify(v);
}

class JsonataFunction {
  constructor(name) { this.name = name; }
}

function evaluate(node, focus, scope) {
  switch (node.type) {
    case 'lit': return node.value;
    case 'context': return focus;
    case 'root': return scope.root;
    case 'var': {
      if (!scope.vars.has(node.name)) {
        if (BUILTINS[node.name]) return new JsonataFunction(node.name); // e.g. passed around, rarely used in this subset
        throw new Error(`Unknown variable or function: $${node.name}`);
      }
      return scope.vars.get(node.name);
    }
    case 'field': {
      const of = evaluate(node.of, focus, scope);
      if (!node.name) return of;
      return mapStep(of, item => {
        const v = (isPlainObject(item) && Object.prototype.hasOwnProperty.call(item, node.name)) ? item[node.name] : undefined;
        return applyLocalPreds(v, node.preds, focus, scope);
      }, true);
    }
    case 'wildcard': {
      const of = evaluate(node.of, focus, scope);
      return mapStep(of, item => applyLocalPreds(valuesOf(item), node.preds, focus, scope), false);
    }
    case 'descendant': {
      const of = evaluate(node.of, focus, scope);
      if (of === undefined) return undefined;
      const list = [];
      collectDescendants(of, list);
      return applyLocalPreds(collapse(list), node.preds, focus, scope);
    }
    case 'predicate': {
      const of = evaluate(node.of, focus, scope);
      return applyPredicate(of, node.pred, (pred, item) => evaluate(pred, item, scope));
    }
    case 'singletonArray': {
      const of = evaluate(node.of, focus, scope);
      if (of === undefined) return undefined;
      return Array.isArray(of) ? of : [of];
    }
    case 'objectConstruct': {
      const of = evaluate(node.of, focus, scope);
      return mapStep(of, item => {
        const obj = {};
        for (const [keyAst, valAst] of node.pairs) {
          const key = evaluate(keyAst, item, scope);
          if (typeof key !== 'string') throw new Error('Object constructor keys must evaluate to a string');
          obj[key] = evaluate(valAst, item, scope);
        }
        return obj;
      }, false);
    }
    case 'array': {
      const out = [];
      for (const it of node.items) {
        const v = evaluate(it, focus, scope);
        if (v === undefined) continue;
        if (Array.isArray(v)) out.push(...v); else out.push(v);
      }
      return out;
    }
    case 'unary': {
      const v = evaluate(node.expr, focus, scope);
      if (v === undefined) return undefined;
      if (typeof v !== 'number') throw new Error('Unary - expects a number');
      return -v;
    }
    case 'ternary': {
      const c = toBool(evaluate(node.cond, focus, scope));
      if (c) return evaluate(node.then, focus, scope);
      return node.else ? evaluate(node.else, focus, scope) : undefined;
    }
    case 'binary': return evalBinary(node, focus, scope);
    case 'chain': {
      const leftVal = evaluate(node.left, focus, scope);
      return evalCall({ type: 'call', name: node.call.name, args: [{ type: 'preval', value: leftVal }, ...node.call.args] }, focus, scope);
    }
    case 'preval': return node.value;
    case 'call': return evalCall(node, focus, scope);
    case 'block': {
      const localScope = { vars: new Map(scope.vars), root: scope.root };
      let result;
      for (const stmt of node.stmts) {
        if (stmt.type === 'assign') { result = evaluate(stmt.expr, focus, localScope); localScope.vars.set(stmt.name, result); }
        else result = evaluate(stmt, focus, localScope);
      }
      return result;
    }
    default: throw new Error(`Unsupported syntax node: ${node.type}`);
  }
}

function evalBinary(node, focus, scope) {
  const { op } = node;
  if (op === 'and') return toBool(evaluate(node.left, focus, scope)) && toBool(evaluate(node.right, focus, scope));
  if (op === 'or') return toBool(evaluate(node.left, focus, scope)) || toBool(evaluate(node.right, focus, scope));

  const l = evaluate(node.left, focus, scope);
  const r = evaluate(node.right, focus, scope);

  if (op === 'in') { if (l === undefined) return false; const arr = Array.isArray(r) ? r : [r]; return arr.some(x => deepEqual(x, l)); }
  if (op === '&') return toConcatStr(l) + toConcatStr(r);
  if (op === '..') {
    if (l === undefined || r === undefined) return undefined;
    if (typeof l !== 'number' || typeof r !== 'number') throw new Error('.. (range) expects two numbers');
    const out = []; for (let i = Math.trunc(l); i <= Math.trunc(r); i++) out.push(i);
    return out;
  }
  if (op === '+' || op === '-' || op === '*' || op === '/' || op === '%') {
    if (l === undefined || r === undefined) return undefined;
    if (typeof l !== 'number' || typeof r !== 'number') throw new Error(`Operator ${op} expects two numbers`);
    if (op === '+') return l + r;
    if (op === '-') return l - r;
    if (op === '*') return l * r;
    if (op === '/') return l / r;
    return l % r;
  }
  if (op === '=' || op === '!=' || op === '<' || op === '<=' || op === '>' || op === '>=') {
    if (l === undefined || r === undefined) return undefined;
    if (op === '=') return deepEqual(l, r);
    if (op === '!=') return !deepEqual(l, r);
    const bothNum = typeof l === 'number' && typeof r === 'number';
    const bothStr = typeof l === 'string' && typeof r === 'string';
    if (!bothNum && !bothStr) throw new Error(`Operator ${op} requires two numbers or two strings`);
    if (op === '<') return l < r;
    if (op === '<=') return l <= r;
    if (op === '>') return l > r;
    return l >= r;
  }
  throw new Error(`Unsupported operator: ${op}`);
}

function evalCall(node, focus, scope) {
  const fn = BUILTINS[node.name];
  if (!fn) throw new Error(`Unknown or unsupported function: $${node.name}`);
  const args = node.args.map(a => a.type === 'preval' ? a.value : evaluate(a, focus, scope));
  return fn(...args);
}


const toArr = v => (v === undefined ? [] : Array.isArray(v) ? v : [v]);

function jNumber(v) {
  if (typeof v === 'number') return v;
  if (typeof v === 'string' && v.trim() !== '' && !isNaN(Number(v))) return Number(v);
  throw new Error(`Unable to cast value to a number: ${JSON.stringify(v)}`);
}
function jString(v) {
  if (v === undefined) return undefined;
  if (typeof v === 'string') return v;
  return JSON.stringify(v);
}

const BUILTINS = {
  count: v => toArr(v).length,
  sum: v => (v === undefined ? undefined : toArr(v).reduce((a, b) => a + jNumber(b), 0)),
  max: v => (v === undefined ? undefined : Math.max(...toArr(v).map(jNumber))),
  min: v => (v === undefined ? undefined : Math.min(...toArr(v).map(jNumber))),
  average: v => (v === undefined ? undefined : toArr(v).reduce((a, b) => a + jNumber(b), 0) / toArr(v).length),
  sort: v => (v === undefined ? undefined : [...toArr(v)].sort((a, b) => (a < b ? -1 : a > b ? 1 : 0))),
  reverse: v => (v === undefined ? undefined : [...toArr(v)].reverse()),
  distinct: v => (v === undefined ? undefined : toArr(v).filter((x, i, arr) => arr.findIndex(y => deepEqual(x, y)) === i)),
  append: (a, b) => toArr(a).concat(toArr(b)),
  join: (arr, sep) => {
    if (arr === undefined) return undefined;
    const a = toArr(arr);
    if (!a.every(x => typeof x === 'string')) throw new Error('Argument 1 of function "join" must be an array of strings');
    return a.join(sep === undefined ? '' : sep);
  },
  exists: v => v !== undefined,
  not: v => (v === undefined ? undefined : !toBool(v)),
  boolean: v => toBool(v),
  string: jString,
  number: v => (v === undefined ? undefined : jNumber(v)),
  uppercase: s => (s === undefined ? undefined : String(s).toUpperCase()),
  lowercase: s => (s === undefined ? undefined : String(s).toLowerCase()),
  trim: s => (s === undefined ? undefined : String(s).trim()),
  length: s => (s === undefined ? undefined : [...String(s)].length),
  substring: (s, start, len) => {
    if (s === undefined) return undefined;
    const chars = [...String(s)];
    let st = start < 0 ? Math.max(chars.length + start, 0) : Math.min(start, chars.length);
    const end = len === undefined ? chars.length : Math.min(st + Math.max(len, 0), chars.length);
    return chars.slice(st, end).join('');
  },
  substringBefore: (s, sep) => (s === undefined ? undefined : (s.includes(sep) ? s.slice(0, s.indexOf(sep)) : s)),
  substringAfter: (s, sep) => (s === undefined ? undefined : (s.includes(sep) ? s.slice(s.indexOf(sep) + sep.length) : s)),
  split: (s, sep, limit) => {
    if (s === undefined) return undefined;
    const parts = sep === '' ? [...s] : s.split(sep);
    return limit === undefined ? parts : parts.slice(0, limit);
  },
  contains: (s, needle) => (s === undefined ? undefined : String(s).includes(needle)),
  replace: (s, pattern, replacement) => (s === undefined ? undefined : String(s).split(pattern).join(replacement)),
  pad: (s, width, char) => {
    if (s === undefined) return undefined;
    const c = char === undefined ? ' ' : char;
    const w = Math.abs(width);
    if (s.length >= w) return s;
    const padding = c.repeat(Math.ceil((w - s.length) / c.length)).slice(0, w - s.length);
    return width < 0 ? padding + s : s + padding;
  },
  keys: v => {
    if (v === undefined) return undefined;
    if (isPlainObject(v)) return Object.keys(v);
    if (Array.isArray(v)) { const ks = new Set(); v.forEach(o => { if (isPlainObject(o)) Object.keys(o).forEach(k => ks.add(k)); }); return [...ks]; }
    return [];
  },
  lookup: (obj, key) => (isPlainObject(obj) ? obj[key] : undefined),
  merge: arr => (toArr(arr).reduce((acc, o) => Object.assign(acc, o), {})),
  type: v => {
    if (v === undefined) return undefined;
    if (v === null) return 'null';
    if (Array.isArray(v)) return 'array';
    if (typeof v === 'object') return 'object';
    return typeof v; // 'number' | 'string' | 'boolean'
  },
};


module('Jsonata Query', 'Queries and transforms JSON with a JSONata expression (jsonata.org) - a hand-written practical subset, not the full language. See the source comment at the top of this file for exactly what is and isn\'t supported, and why (the real jsonata library is a ~300KB bundle this project does not vendor).',
  [A.area('Query', '$')],
  (jsonText, query) => {
    let data;
    try { data = JSON.parse(jsonText); } catch (e) { throw new Error(`Invalid input JSON: ${e.message}`); }
    let result;
    try {
      const ast = parse(query);
      result = evaluate(ast, data, { vars: new Map(), root: data });
    } catch (e) {
      throw new Error(`Invalid Jsonata expression: ${e.message}`);
    }
    return JSON.stringify(result === undefined ? '' : result);
  }, { text: true });
