import { module } from './_cat.js';
import { A } from '../../core/registry.js';

module('Template', 'Renders a template against JSON input, substituting {{placeholder}} variables - a practical subset of Handlebars/Mustache syntax (see source comment for exactly what is supported).',
  [A.area('Template', '')],
  (jsonText, templateStr) => {
    let data;
    try { data = JSON.parse(jsonText); } catch (e) { throw new Error(`Invalid input JSON: ${e.message}`); }
    return renderTemplate(templateStr, data);
  }, { text: true });

const ESCAPE = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#x27;', '`': '&#x60;', '=': '&#x3D;' };
const escapeExpr = s => String(s).replace(/[&<>"'`=]/g, c => ESCAPE[c]);

function stringify(v) {
  if (v === null || v === undefined) return '';
  if (Array.isArray(v)) return v.join(',');
  if (typeof v === 'object') return '[object Object]';
  return String(v);
}

function truthy(v) {
  if (Array.isArray(v)) return v.length > 0;
  return !!v;
}

function resolvePath(ctx, path, special) {
  if (path === 'this' || path === '.') return ctx;
  if (path.startsWith('@')) return special ? special[path] : undefined;
  if (path.startsWith('this.')) path = path.slice(5);
  let cur = ctx;
  for (const seg of path.split('.')) {
    if (cur === null || cur === undefined) return undefined;
    cur = cur[seg];
  }
  return cur;
}

function tokenize(tmpl) {
  const tokens = [];
  let i = 0;
  while (i < tmpl.length) {
    const start = tmpl.indexOf('{{', i);
    if (start === -1) { tokens.push({ type: 'text', text: tmpl.slice(i) }); break; }
    if (start > i) tokens.push({ type: 'text', text: tmpl.slice(i, start) });
    const triple = tmpl.slice(start, start + 3) === '{{{';
    const openLen = triple ? 3 : 2;
    const closeSeq = triple ? '}}}' : '}}';
    const end = tmpl.indexOf(closeSeq, start + openLen);
    if (end === -1) throw new Error('Unclosed {{ ... }} tag');
    tokens.push({ type: 'tag', raw: tmpl.slice(start + openLen, end), triple });
    i = end + closeSeq.length;
  }
  return tokens;
}

const BLOCK_HELPERS = ['each', 'if', 'unless', 'with'];

function parseNodes(tokens, pos) {
  const nodes = [];
  while (pos < tokens.length) {
    const tok = tokens[pos];
    if (tok.type === 'text') { nodes.push({ type: 'text', text: tok.text }); pos++; continue; }
    const raw = tok.raw.trim();
    if (raw.startsWith('!')) { pos++; continue; }
    if (raw === 'else' || raw.startsWith('/')) return { nodes, pos };

    if (raw.startsWith('#')) {
      const inner = raw.slice(1).trim();
      const sp = inner.search(/\s/);
      const kw = sp === -1 ? inner : inner.slice(0, sp);
      const arg = sp === -1 ? '' : inner.slice(sp + 1).trim();
      if (!BLOCK_HELPERS.includes(kw)) throw new Error(`Unsupported block helper {{#${kw}}} (supported: ${BLOCK_HELPERS.join(', ')})`);
      pos++;
      const main = parseNodes(tokens, pos);
      pos = main.pos;
      let elseNodes = [];
      if (tokens[pos] && tokens[pos].type === 'tag' && tokens[pos].raw.trim() === 'else') {
        pos++;
        const elseRes = parseNodes(tokens, pos);
        elseNodes = elseRes.nodes;
        pos = elseRes.pos;
      }
      if (!(tokens[pos] && tokens[pos].type === 'tag' && tokens[pos].raw.trim() === `/${kw}`)) {
        throw new Error(`Missing {{/${kw}}} to close {{#${kw} ${arg}}}`);
      }
      pos++;
      nodes.push({ type: kw, arg, body: main.nodes, elseBody: elseNodes });
      continue;
    }

    const unescaped = tok.triple || raw.startsWith('&');
    const path = raw.startsWith('&') ? raw.slice(1).trim() : raw;
    if (!path) throw new Error('Empty {{ }} tag');
    nodes.push({ type: 'var', path, unescaped });
    pos++;
  }
  return { nodes, pos };
}

function render(nodes, ctx, special) {
  let out = '';
  for (const node of nodes) {
    switch (node.type) {
      case 'text': out += node.text; break;
      case 'var': {
        const v = resolvePath(ctx, node.path, special);
        out += node.unescaped ? stringify(v) : escapeExpr(stringify(v));
        break;
      }
      case 'if': out += render(truthy(resolvePath(ctx, node.arg, special)) ? node.body : node.elseBody, ctx, special); break;
      case 'unless': out += render(truthy(resolvePath(ctx, node.arg, special)) ? node.elseBody : node.body, ctx, special); break;
      case 'with': out += render(node.body, resolvePath(ctx, node.arg, special), special); break;
      case 'each': {
        const v = resolvePath(ctx, node.arg, special);
        if (Array.isArray(v) && v.length) {
          out += v.map((item, idx) => render(node.body, item, { '@index': idx, '@first': idx === 0, '@last': idx === v.length - 1 })).join('');
        } else if (v && typeof v === 'object' && !Array.isArray(v) && Object.keys(v).length) {
          const keys = Object.keys(v);
          out += keys.map((k, idx) => render(node.body, v[k], { '@key': k, '@index': idx, '@first': idx === 0, '@last': idx === keys.length - 1 })).join('');
        } else {
          out += render(node.elseBody, ctx, special);
        }
        break;
      }
    }
  }
  return out;
}

function renderTemplate(templateStr, data) {
  const tokens = tokenize(templateStr);
  const { nodes, pos } = parseNodes(tokens, 0);
  if (pos !== tokens.length) throw new Error(`Unexpected {{${tokens[pos].raw}}} with no matching opening block tag`);
  return render(nodes, data, {});
}
