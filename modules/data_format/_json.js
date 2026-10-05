export class Flt { constructor(v) { this.v = v; } }

export function parseJsonTyped(s) {
  let i = 0;
  const ws = () => { while (i < s.length && /\s/.test(s[i])) i++; };
  function val() {
    ws();
    const c = s[i];
    if (c === '{') return obj();
    if (c === '[') return arr();
    if (c === '"') return str();
    if (s.startsWith('true', i)) { i += 4; return true; }
    if (s.startsWith('false', i)) { i += 5; return false; }
    if (s.startsWith('null', i)) { i += 4; return null; }
    return num();
  }
  function obj() {
    i++; ws();
    const o = {};
    if (s[i] === '}') { i++; return o; }
    while (true) {
      ws();
      const k = str();
      ws(); i++;
      o[k] = val();
      ws();
      if (s[i] === ',') { i++; continue; }
      if (s[i] === '}') { i++; break; }
      throw new Error('Invalid JSON');
    }
    return o;
  }
  function arr() {
    i++; ws();
    const a = [];
    if (s[i] === ']') { i++; return a; }
    while (true) {
      a.push(val());
      ws();
      if (s[i] === ',') { i++; continue; }
      if (s[i] === ']') { i++; break; }
      throw new Error('Invalid JSON');
    }
    return a;
  }
  function str() {
    i++;
    let out = '';
    while (s[i] !== '"') {
      if (i >= s.length) throw new Error('Invalid JSON');
      if (s[i] === '\\') {
        i++;
        const e = s[i];
        if (e === 'n') out += '\n';
        else if (e === 't') out += '\t';
        else if (e === 'r') out += '\r';
        else if (e === 'b') out += '\b';
        else if (e === 'f') out += '\f';
        else if (e === 'u') { out += String.fromCharCode(parseInt(s.slice(i + 1, i + 5), 16)); i += 4; }
        else out += e;
        i++;
      } else { out += s[i]; i++; }
    }
    i++;
    return out;
  }
  function num() {
    const start = i;
    if (s[i] === '-') i++;
    while (/[0-9]/.test(s[i])) i++;
    let isFloat = false;
    if (s[i] === '.') { isFloat = true; i++; while (/[0-9]/.test(s[i])) i++; }
    if (s[i] === 'e' || s[i] === 'E') {
      isFloat = true; i++;
      if (s[i] === '+' || s[i] === '-') i++;
      while (/[0-9]/.test(s[i])) i++;
    }
    const text = s.slice(start, i);
    if (isFloat) return new Flt(Number(text));
    const n = BigInt(text);
    return (n >= -9007199254740991n && n <= 9007199254740991n) ? Number(n) : n;
  }
  return val();
}

export function stringifyTyped(obj, indent = 2) {
  return JSON.stringify(obj, (_, v) => {
    if (typeof v === 'bigint') return `@@BIGINT:${v}@@`;
    if (v instanceof Flt) return v.v;
    return v;
  }, indent).replace(/"@@BIGINT:(-?\d+)@@"/g, '$1');
}
