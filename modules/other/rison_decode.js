import { module } from './_cat.js';
import { Flt, toPyJson } from './_cat.js';

function tokString(s, i) {
  if (s[i] === "'") {
    i++;
    let out = '';
    while (s[i] !== "'") {
      if (s[i] === '!') {
        i++;
        out += s[i] === "'" ? "'" : '!';
      } else {
        out += s[i];
      }
      i++;
    }
    return [out, i + 1];
  }
  let j = i;
  while (j < s.length && !",:()!'".includes(s[j]) && !/\s/.test(s[j])) j++;
  return [s.slice(i, j), j];
}

function parse(s, i) {
  if (s[i] === '(') {
    i++;
    const obj = new Map();
    if (s[i] === ')') return [obj, i + 1];
    for (;;) {
      let k, v;
      [k, i] = tokString(s, i);
      if (s[i] !== ':') throw new Error(`Expected ':' at offset ${i}`);
      [v, i] = parse(s, i + 1);
      obj.set(k, v);
      if (s[i] === ',') { i++; continue; }
      if (s[i] !== ')') throw new Error(`Expected ')' at offset ${i}`);
      return [obj, i + 1];
    }
  }
  if (s[i] === '!') {
    if (s[i + 1] === '(') {
      i += 2;
      const arr = [];
      if (s[i] === ')') return [arr, i + 1];
      for (;;) {
        let v;
        [v, i] = parse(s, i);
        arr.push(v);
        if (s[i] === ',') { i++; continue; }
        if (s[i] !== ')') throw new Error(`Expected ')' at offset ${i}`);
        return [arr, i + 1];
      }
    }
    if (s[i + 1] === 't') return [true, i + 2];
    if (s[i + 1] === 'f') return [false, i + 2];
    if (s[i + 1] === 'n') return [null, i + 2];
  }
  if (s[i] === "'") return tokString(s, i);
  const [tok, j] = tokString(s, i);
  if (tok === '') throw new Error(`Unexpected character at offset ${i}: '${s[i]}'`);
  const hasDotOrE = tok.includes('.') || /e/i.test(tok);
  if (!hasDotOrE) {
    if (/^[+-]?\d+$/.test(tok)) return [parseInt(tok, 10), j];
    return [tok, j];
  }
  if (/^[+-]?(\d+\.?\d*|\.\d+)(e[+-]?\d+)?$/i.test(tok)) {
    const f = Number(tok);
    if (!Number.isNaN(f)) return [new Flt(f), j];
  }
  return [tok, j];
}

module('Rison Decode', 'Decodes Rison (a compact, URL-safe alternative to JSON) to JSON.', [],
  (t) => {
    const [val] = parse(t.trim(), 0);
    return toPyJson(val);
  }, { text: true });
