import { module } from './_cat.js';
import { Flt, pyFloatRepr, toPyJson } from './_cat.js';

function pyStr(v) {
  if (v instanceof Flt) return pyFloatRepr(v.value);
  if (typeof v === 'boolean') return v ? 'True' : 'False';
  return String(v);
}

function deser(s, i) {
  const kind = s[i];
  if (kind === 'N') return [null, i + 2];
  if (kind === 'b') return [s[i + 2] === '1', s.indexOf(';', i) + 1];
  if (kind === 'i') { const j = s.indexOf(';', i); return [parseInt(s.slice(i + 2, j), 10), j + 1]; }
  if (kind === 'd') { const j = s.indexOf(';', i); return [new Flt(parseFloat(s.slice(i + 2, j))), j + 1]; }
  if (kind === 's') {
    const j = s.indexOf(':', i + 2);
    const n = parseInt(s.slice(i + 2, j), 10);
    const start = j + 2; // skip :"
    const val = s.slice(start, start + n);
    return [val, start + n + 2]; // skip ";
  }
  if (kind === 'a') {
    const j = s.indexOf(':', i + 2);
    const count = parseInt(s.slice(i + 2, j), 10);
    let p = j + 2; // skip :{
    const items = [];
    for (let c = 0; c < count; c++) {
      let k, v;
      [k, p] = deser(s, p);
      [v, p] = deser(s, p);
      items.push([k, v]);
    }
    p += 1; // skip }
    if (items.every(([k], idx) => k === idx)) return [items.map(([, v]) => v), p];
    const m = new Map();
    for (const [k, v] of items) m.set(pyStr(k), v);
    return [m, p];
  }
  if (kind === 'O') {
    const j = s.indexOf(':', i + 2);
    const nlen = parseInt(s.slice(i + 2, j), 10);
    const name = s.slice(j + 2, j + 2 + nlen);
    let p = j + 2 + nlen + 2;
    const j2 = s.indexOf(':', p);
    const count = parseInt(s.slice(p, j2), 10);
    p = j2 + 2;
    const m = new Map();
    m.set('__class__', name);
    for (let c = 0; c < count; c++) {
      let k, v;
      [k, p] = deser(s, p);
      [v, p] = deser(s, p);
      m.set(pyStr(k), v);
    }
    return [m, p + 1];
  }
  throw new Error(`Unknown PHP serialize type '${kind}' at offset ${i}`);
}

module('PHP Deserialize', "Converts PHP's serialize() format to JSON.", [],
  (t) => {
    const [val] = deser(t.trim(), 0);
    return toPyJson(val);
  }, { text: true });
