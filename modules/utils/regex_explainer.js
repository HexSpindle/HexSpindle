import { module } from './_cat.js';

const TOKENS = [
  ['\\d', 'a digit (0-9)'], ['\\D', 'any character that is not a digit'], ['\\w', 'a word character (letter, digit or _)'], ['\\W', 'any character that is not a word character'],
  ['\\s', 'whitespace'], ['\\S', 'any character that is not whitespace'], ['\\b', 'a word boundary'], ['\\B', 'a position that is not a word boundary'],
  ['\\n', 'a newline'], ['\\t', 'a tab'], ['^', 'the start of the string/line'], ['$', 'the end of the string/line'], ['.', 'any character (except newline)'],
];
const ESCAPED = Object.fromEntries([...".^$*+?()[]{}|\\"].map(c => [c, `a literal '${c}'`]));

function describeGroup(body, kind) {
  if (kind === '(?:') return `a non-capturing group of: ${body}`;
  if (kind === '(?=') return `(lookahead) followed by: ${body}`;
  if (kind === '(?!') return `(negative lookahead) NOT followed by: ${body}`;
  if (kind === '(?<=') return `(lookbehind) preceded by: ${body}`;
  if (kind === '(?<!') return `(negative lookbehind) NOT preceded by: ${body}`;
  return `a capturing group of: ${body}`;
}

function tokenizeDesc(pattern) {
  const out = [];
  let i = 0, n = pattern.length, groupNo = 0;
  while (i < n) {
    const c = pattern[i];
    if (c === '\\' && i + 1 < n) {
      const two = pattern.slice(i, i + 2);
      const found = TOKENS.find(([t]) => t === two);
      if (found) out.push(found[1]);
      else if (ESCAPED[pattern[i + 1]]) out.push(ESCAPED[pattern[i + 1]]);
      else out.push(`escaped '${pattern[i + 1]}'`);
      i += 2;
      continue;
    }
    if (c === '[') {
      let j = i + 1;
      const neg = pattern[j] === '^';
      if (neg) j++;
      const start = j;
      while (j < n && pattern[j] !== ']') j++;
      const body = pattern.slice(start, j);
      out.push(`${neg ? 'none of' : 'one of'} the characters [${body}]`);
      i = j + 1;
      continue;
    }
    if (c === '(') {
      let kind = '(';
      for (const k of ['(?:', '(?=', '(?!', '(?<=', '(?<!']) {
        if (pattern.startsWith(k, i)) { kind = k; break; }
      }
      if (kind === '(' && !pattern.startsWith('(?', i)) groupNo++;
      let depth = 1, j = i + kind.length;
      while (j < n && depth) {
        if (pattern[j] === '(' && pattern[j - 1] !== '\\') depth++;
        else if (pattern[j] === ')' && pattern[j - 1] !== '\\') depth--;
        j++;
      }
      const body = pattern.slice(i + kind.length, j - 1);
      const label = describeGroup(tokenizeDesc(body).join(' / '), kind);
      out.push((kind === '(' ? `group ${groupNo}: ` : '') + label);
      i = j;
      continue;
    }
    if (c === '*' || c === '+' || c === '?' || (c === '{' && /^\{\d+(,\d*)?\}/.test(pattern.slice(i)))) {
      if (out.length) {
        if (c === '*') out[out.length - 1] += ', zero or more times';
        else if (c === '+') out[out.length - 1] += ', one or more times';
        else if (c === '?') out[out.length - 1] += ', zero or one time (optional)';
        else {
          const m = /^\{(\d+)(,(\d*))?\}/.exec(pattern.slice(i));
          const [, lo, hasComma, hi] = m;
          if (hasComma === undefined) out[out.length - 1] += `, exactly ${lo} times`;
          else if (hi) out[out.length - 1] += `, between ${lo} and ${hi} times`;
          else out[out.length - 1] += `, ${lo} or more times`;
          i += m[0].length - 1;
        }
      }
      i++;
      continue;
    }
    if (c === '|') { out.push('OR'); i++; continue; }
    if (c === '^' || c === '$' || c === '.') { out.push(TOKENS.find(([t]) => t === c)[1]); i++; continue; }
    out.push(`a literal '${c}'`);
    i++;
  }
  return out;
}

module('Regex Explainer', 'Breaks a regular expression down into a plain-English description of each part.', [],
  (t) => {
    const pattern = t.trim();
    try { new RegExp(pattern); } catch (e) { throw new Error(`Not a valid regex: ${e.message}`); }
    const parts = tokenizeDesc(pattern);
    return parts.length ? parts.map((p, i) => `${i + 1}. ${p}`).join('\n') : '(empty pattern)';
  }, { text: true });
