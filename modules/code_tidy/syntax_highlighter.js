import { module } from './_cat.js';
import { A, Html } from '../../core/registry.js';
import { tokenize } from './_jstok.js';

const LANGS = ['JavaScript', 'JSON', 'CSS', 'XML / HTML', 'SQL'];

const esc = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const span = (cls, text) => (cls ? `<span class="${cls}">${esc(text)}</span>` : esc(text));

const JS_KEYWORDS = new Set([
  'break', 'case', 'catch', 'class', 'const', 'continue', 'debugger', 'default', 'delete', 'do', 'else', 'export',
  'extends', 'finally', 'for', 'function', 'if', 'import', 'in', 'instanceof', 'let', 'new', 'of', 'return', 'static',
  'super', 'switch', 'throw', 'try', 'typeof', 'var', 'void', 'while', 'with', 'yield', 'async', 'await', 'get', 'set',
]);
const JS_LITERALS = new Set(['true', 'false', 'null', 'undefined', 'NaN', 'Infinity', 'this']);

function highlightJs(src, { jsonMode = false } = {}) {
  const toks = tokenize(src);
  let out = '';
  for (let i = 0; i < toks.length; i++) {
    const [kind, text] = toks[i];
    if (kind === 'ws') { out += text; continue; }
    if (kind === 'lc' || kind === 'bc') { out += span('hljs-comment', text); continue; }
    if (kind === 're') { out += span('hljs-regexp', text); continue; }
    if (kind === 'num') { out += span('hljs-number', text); continue; }
    if (kind === 'str') {
      if (jsonMode) {
        let j = i + 1;
        while (j < toks.length && toks[j][0] === 'ws') j++;
        const isKey = j < toks.length && toks[j][0] === 'p' && toks[j][1] === ':';
        out += span(isKey ? 'hljs-attr' : 'hljs-string', text);
      } else {
        out += span('hljs-string', text);
      }
      continue;
    }
    if (kind === 'id') {
      if (jsonMode) out += span(JS_LITERALS.has(text) ? 'hljs-literal' : null, text);
      else if (JS_KEYWORDS.has(text)) out += span('hljs-keyword', text);
      else if (JS_LITERALS.has(text)) out += span('hljs-literal', text);
      else out += span(null, text);
      continue;
    }
    out += span(null, text);
  }
  return out;
}

function highlightByRules(src, rules) {
  const re = new RegExp(rules.map(([, pat]) => `(${pat})`).join('|'), 'gy');
  let out = '', i = 0;
  while (i < src.length) {
    re.lastIndex = i;
    const m = re.exec(src);
    if (!m || m.index !== i) { out += esc(src[i]); i++; continue; }
    const groupIdx = m.slice(1).findIndex((g) => g !== undefined);
    out += span(rules[groupIdx][0], m[0]);
    i += m[0].length || 1;
  }
  return out;
}

const CSS_RULES = [
  ['hljs-comment', String.raw`/\*[\s\S]*?\*/`],
  ['hljs-string', String.raw`"(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*'`],
  ['hljs-keyword', String.raw`@[a-zA-Z-]+`],
  ['hljs-number', String.raw`#[0-9a-fA-F]{3,8}\b|-?\d+\.?\d*(?:%|[a-zA-Z]{1,4})?\b`],
  ['hljs-attribute', String.raw`[a-zA-Z-]+(?=\s*:)`],
  ['hljs-selector-class', String.raw`\.[a-zA-Z_-][\w-]*`],
  ['hljs-selector-id', String.raw`#[a-zA-Z_-][\w-]*`],
  [null, String.raw`[^/"'@#.\n]+|\n`],
];

const XML_RULES = [
  ['hljs-comment', String.raw`<!--[\s\S]*?-->`],
  ['hljs-meta', String.raw`<!DOCTYPE[^>]*>`],
  ['hljs-name', String.raw`</?[a-zA-Z][\w:-]*`],
  ['hljs-attr', String.raw`[a-zA-Z_:][\w:.-]*(?==)`],
  ['hljs-string', String.raw`"[^"]*"|'[^']*'`],
  ['hljs-tag', String.raw`/?>`],
  [null, String.raw`[^<>"']+|['"<>]`],
];

const SQL_KEYWORDS = [
  'SELECT', 'FROM', 'WHERE', 'INSERT', 'INTO', 'VALUES', 'UPDATE', 'SET', 'DELETE', 'CREATE', 'TABLE', 'DROP', 'ALTER',
  'JOIN', 'INNER', 'OUTER', 'LEFT', 'RIGHT', 'ON', 'AS', 'AND', 'OR', 'NOT', 'NULL', 'IS', 'IN', 'LIKE', 'BETWEEN',
  'GROUP', 'BY', 'ORDER', 'HAVING', 'LIMIT', 'OFFSET', 'DISTINCT', 'UNION', 'ALL', 'CASE', 'WHEN', 'THEN', 'ELSE',
  'END', 'EXISTS', 'DEFAULT', 'PRIMARY', 'KEY', 'FOREIGN', 'REFERENCES', 'INDEX', 'VIEW', 'WITH', 'ASC', 'DESC',
];
const SQL_RULES = [
  ['hljs-comment', String.raw`--[^\n]*|/\*[\s\S]*?\*/`],
  ['hljs-string', String.raw`'(?:''|[^'])*'`],
  ['hljs-keyword', String.raw`\b(?:${SQL_KEYWORDS.join('|')})\b`],
  ['hljs-number', String.raw`\b\d+\.?\d*\b`],
  [null, String.raw`[^-/'\w]+|\w+`],
];

function highlightCss(src) { return highlightByRules(src, CSS_RULES); }
function highlightXml(src) { return highlightByRules(src, XML_RULES); }
function highlightSql(src) { return highlightByRules(src, SQL_RULES); }

const STYLE = `<style>
.hs-hljs{font-family:ui-monospace,Consolas,Menlo,monospace;white-space:pre-wrap;word-break:break-word;line-height:1.5}
.hs-hljs .hljs-comment{color:#7a8b99;font-style:italic}
.hs-hljs .hljs-string{color:#8fd16b}
.hs-hljs .hljs-number,.hs-hljs .hljs-literal{color:#d19a66}
.hs-hljs .hljs-keyword{color:#c678dd}
.hs-hljs .hljs-regexp{color:#56b6c2}
.hs-hljs .hljs-attr,.hs-hljs .hljs-attribute{color:#61afef}
.hs-hljs .hljs-name,.hs-hljs .hljs-tag{color:#e06c75}
.hs-hljs .hljs-meta{color:#d19a66}
.hs-hljs .hljs-selector-class,.hs-hljs .hljs-selector-id{color:#e5c07b}
</style>`;

module('Syntax highlighter', `Adds syntax highlighting (as HTML with hljs-* classes) to source code. Supports a small, practical subset of languages (${LANGS.join(', ')}) using this app's own tokenizers rather than a vendored highlight.js - no auto-detect and no highlighting of languages embedded inside another (e.g. <script> inside HTML).`,
  [A.select('Language', LANGS)],
  (t, lang) => {
    let body;
    if (lang === 'JSON') body = highlightJs(t, { jsonMode: true });
    else if (lang === 'CSS') body = highlightCss(t);
    else if (lang === 'XML / HTML') body = highlightXml(t);
    else if (lang === 'SQL') body = highlightSql(t);
    else body = highlightJs(t);
    return new Html(`${STYLE}<pre class="hs-hljs"><code>${body}</code></pre>`);
  }, { text: true }
);
