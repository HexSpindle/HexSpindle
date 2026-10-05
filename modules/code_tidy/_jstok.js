const KEYWORDS_BEFORE_REGEX = new Set(['return', 'typeof', 'instanceof', 'in', 'of', 'new', 'delete', 'void', 'throw', 'case', 'do', 'else', 'yield', 'await']);

const PUNCT = ['{', '}', '(', ')', '[', ']', ';', ',', '<', '>', '<=', '>=', '==', '!=', '===', '!==', '+', '-', '*', '/', '%', '**', '++', '--', '<<', '>>', '>>>', '&', '|', '^', '!', '~',
  '&&', '||', '??', '?', '?.', ':', '=', '+=', '-=', '*=', '/=', '%=', '**=', '<<=', '>>=', '>>>=', '&=', '|=', '^=', '&&=', '||=', '??=', '=>', '.', '...', '@', '#']
  .sort((a, b) => b.length - a.length);

function reEscape(s) { return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); }

const PUNCT_RX = PUNCT.map(reEscape).join('|');
const TOKEN_RX = new RegExp(
  '(?<ws>\\s+)' +
  '|(?<lc>//[^\\n]*)' +
  '|(?<bc>/\\*[\\s\\S]*?\\*/)' +
  '|(?<str>"(?:\\\\.|[^"\\\\\\n])*"|\'(?:\\\\.|[^\'\\\\\\n])*\')' +
  '|(?<num>0[xXbBoO][0-9a-fA-F_]+n?|\\d[\\d_]*\\.?\\d*(?:[eE][+-]?\\d+)?n?|\\.\\d+(?:[eE][+-]?\\d+)?)' +
  '|(?<id>[A-Za-z_$\\u0080-\\uffff][\\w$\\u0080-\\uffff]*)' +
  '|(?<p>' + PUNCT_RX + ')',
  'y'
);

const REGEX_LIT_RX = /\/(?:\\.|\[(?:\\.|[^\]\\\n])*\]|[^/\\\n[])+\/[a-z]*/y;

export function tokenize(src) {
  const toks = [];
  let i = 0;
  const n = src.length;
  let lastSig = null;
  while (i < n) {
    const c = src[i];
    if (c === '`') {
      let j = i + 1, depth = 0;
      while (j < n) {
        if (src[j] === '\\') { j += 2; continue; }
        if (src[j] === '$' && j + 1 < n && src[j + 1] === '{') { depth += 1; j += 2; continue; }
        if (src[j] === '}' && depth) { depth -= 1; }
        else if (src[j] === '`' && depth === 0) { break; }
        j += 1;
      }
      const tok = ['str', src.slice(i, j + 1)];
      toks.push(tok); lastSig = tok; i = j + 1;
      continue;
    }
    if (c === '/' && !src.startsWith('//', i) && !src.startsWith('/*', i)) {
      const prev = lastSig;
      if (prev === null || (prev[0] === 'p' && !(prev[1] === ')' || prev[1] === ']' || prev[1] === '}')) || (prev[0] === 'id' && KEYWORDS_BEFORE_REGEX.has(prev[1]))) {
        REGEX_LIT_RX.lastIndex = i;
        const m = REGEX_LIT_RX.exec(src);
        if (m && m.index === i) {
          const tok = ['re', m[0]];
          toks.push(tok); lastSig = tok; i += m[0].length;
          continue;
        }
      }
    }
    TOKEN_RX.lastIndex = i;
    const m = TOKEN_RX.exec(src);
    if (!m || m.index !== i) {
      const tok = ['p', c];
      toks.push(tok); lastSig = tok; i += 1;
      continue;
    }
    const g = m.groups;
    let kind, text;
    if (g.ws !== undefined) { kind = 'ws'; text = g.ws; }
    else if (g.lc !== undefined) { kind = 'lc'; text = g.lc; }
    else if (g.bc !== undefined) { kind = 'bc'; text = g.bc; }
    else if (g.str !== undefined) { kind = 'str'; text = g.str; }
    else if (g.num !== undefined) { kind = 'num'; text = g.num; }
    else if (g.id !== undefined) { kind = 'id'; text = g.id; }
    else { kind = 'p'; text = g.p; }
    const tok = [kind, text];
    toks.push(tok);
    if (kind !== 'ws' && kind !== 'lc' && kind !== 'bc') lastSig = tok;
    i = m.index + m[0].length;
  }
  return toks;
}

const WORDLIKE = new Set(['id', 'num', 'str', 're']);

export function minify(src) {
  const toks = tokenize(src);
  const out = [];
  let prev = null, pendingNl = false, pendingWs = false;
  const wordy = (k) => k === 'id' || k === 'num';
  for (const [kind, text] of toks) {
    if (kind === 'ws' || kind === 'lc' || kind === 'bc') {
      if (text.includes('\n')) pendingNl = true;
      pendingWs = true;
      continue;
    }
    if (prev !== null) {
      const [pk, pt] = prev;
      if (pendingNl && (WORDLIKE.has(pk) || [')', ']', '}', '++', '--'].includes(pt)) && (WORDLIKE.has(kind) || ['(', '[', '{', '+', '-', '++', '--', '!', '~', '`'].includes(text))) {
        if (!['{', ';', ','].includes(pt) && !(['+', '-', '(', '['].includes(text) && pk === 'p' && !([')', ']', '}'].includes(pt)))) {
          out.push('\n');
        }
      } else if (pendingWs && ((wordy(pk) && wordy(kind)) || (pt.slice(-1) === '+' || pt.slice(-1) === '-') && text.slice(0, 1) === pt.slice(-1) && pk === 'p' && kind === 'p'
                 || (pk === 'num' && text === '.') || (pk === 'p' && pt === '/' && kind === 're'))) {
        out.push(' ');
      }
    }
    out.push(text);
    prev = [kind, text];
    pendingNl = pendingWs = false;
  }
  return out.join('');
}

export function beautify(src, indent = '    ') {
  const toks = tokenize(src).filter(t => t[0] !== 'ws');
  const out = [];
  let level = 0;
  const stack = [];
  let lineStart = true;
  let prev = null;

  function emit(s) {
    if (lineStart && s) {
      out.push(indent.repeat(level));
      lineStart = false;
    }
    out.push(s);
  }
  function sp() {
    if (!lineStart && out.length && !/[ \n]$/.test(out[out.length - 1])) out.push(' ');
  }
  function newline() {
    if (!lineStart) { out.push('\n'); lineStart = true; }
  }

  let i = 0;
  while (i < toks.length) {
    const [kind, text] = toks[i];
    const nxt = i + 1 < toks.length ? toks[i + 1] : [null, ''];
    if (kind === 'lc' || kind === 'bc') {
      if (prev !== null && !lineStart && kind === 'lc') sp();
      emit(text);
      if (kind === 'lc') newline(); else sp();
      i += 1;
      continue;
    }
    const pk = prev ? prev[0] : null, pt = prev ? prev[1] : '';
    if (text === '{') {
      if (!['(', '[', '{', ''].includes(pt)) sp();
      emit('{');
      if (nxt[1] === '}') {
        emit('}');
        i += 2;
        prev = ['p', '}'];
        continue;
      }
      stack.push('{');
      level += 1;
      newline();
    } else if (text === '}') {
      if (stack.length && stack[stack.length - 1] === '{') stack.pop();
      level = Math.max(0, level - 1);
      newline();
      emit('}');
      if (!((nxt[1] === ')' || nxt[1] === ',' || nxt[1] === ';' || nxt[1] === '.' || nxt[1] === ']' || nxt[1] === 'else' || nxt[1] === 'catch' || nxt[1] === 'finally' || nxt[1] === 'while') && nxt[0] !== 'lc')) {
        newline();
      } else if (['else', 'catch', 'finally', 'while'].includes(nxt[1])) {
        sp();
      }
    } else if (text === '(' || text === '[') {
      if (text === '(' && pk === 'id' && ['if', 'for', 'while', 'switch', 'catch', 'with', 'return', 'typeof', 'await', 'in', 'of', 'else', 'do'].includes(pt)) {
        sp();
      } else if ((text === '(' && pt === '=>') || (text === '(' && pk === 'p' && ['=', '+', '-', '*', '/', '&&', '||', ':', '?', '==', '===', '!=', '!==', ','].includes(pt))) {
        if (pt !== ',') sp();
      }
      emit(text);
      stack.push(text);
    } else if (text === ')' || text === ']') {
      if (stack.length && (stack[stack.length - 1] === '(' || stack[stack.length - 1] === '[')) stack.pop();
      emit(text);
    } else if (text === ';') {
      emit(';');
      if (stack.length && stack[stack.length - 1] === '(') sp();
      else newline();
    } else if (text === ',') {
      emit(',');
      if (stack.length && stack[stack.length - 1] === '{') newline();
      else sp();
    } else if (text === ':') {
      if (stack.length && stack[stack.length - 1] === '{' && !toks.slice(Math.max(0, i - 6), i).some(t => t[1] === '?')) {
        emit(':');
        out.push(' ');
      } else {
        sp();
        emit(':');
        out.push(' ');
      }
    } else if (kind === 'p' && ['=', '==', '===', '!=', '!==', '<', '>', '<=', '>=', '&&', '||', '??', '?', '=>', '*', '%', '**', '+=', '-=', '*=', '/=', '&', '|', '^', '<<', '>>', '+', '-', '/'].includes(text)) {
      const unary = (text === '+' || text === '-') && (pk === null || (pk === 'p' && !([')', ']', '}'].includes(pt))) || (pk === 'id' && KEYWORDS_BEFORE_REGEX.has(pt)));
      if (text === '?' && nxt[1] === '.') {
        emit(text);
      } else if (unary) {
        if (pk === 'id') sp();
        emit(text);
      } else {
        sp();
        emit(text);
        out.push(' ');
      }
    } else if (['.', '?.', '...', '!', '~', '++', '--', '@', '#'].includes(text)) {
      if (['!', '~', '...'].includes(text) && ['id', 'str', 'num'].includes(pk) && !KEYWORDS_BEFORE_REGEX.has(pt)) sp();
      emit(text);
    } else {
      if (prev && ((['id', 'num', 'str', 're'].includes(pk) || [')', ']', '}'].includes(pt)) && ['id', 'num', 'str', 're'].includes(kind)) && !lineStart) sp();
      emit(text);
    }
    prev = [kind, text];
    i += 1;
  }
  return out.join('').replace(/\s+$/, '') + '\n';
}
