import { module } from './_cat.js';
import { parseJsonTyped, Flt, pyFloatRepr } from './_cat.js';
import { concatBytes, encodeUtf8, decodeLatin1 } from '../../core/util.js';

function ser(v) {
  if (v === null) return encodeUtf8('N;');
  if (typeof v === 'boolean') return encodeUtf8(`b:${v ? 1 : 0};`);
  if (v instanceof Flt) return encodeUtf8(`d:${pyFloatRepr(v.value)};`);
  if (typeof v === 'number') return encodeUtf8(`i:${v};`);
  if (typeof v === 'string') {
    const b = encodeUtf8(v);
    return concatBytes([encodeUtf8(`s:${b.length}:"`), b, encodeUtf8('";')]);
  }
  if (Array.isArray(v)) {
    const body = concatBytes(v.map((x, i) => concatBytes([ser(i), ser(x)])));
    return concatBytes([encodeUtf8(`a:${v.length}:{`), body, encodeUtf8('}')]);
  }
  if (v instanceof Map) {
    const entries = [...v.entries()];
    const body = concatBytes(entries.map(([k, x]) => concatBytes([ser(k), ser(x)])));
    return concatBytes([encodeUtf8(`a:${entries.length}:{`), body, encodeUtf8('}')]);
  }
  throw new Error(`Cannot serialize type ${v === undefined ? 'undefined' : typeof v}`);
}

module('PHP Serialize', "Converts JSON to PHP's serialize() format.", [],
  (t) => decodeLatin1(ser(parseJsonTyped(t))), { text: true });
