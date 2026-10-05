import { module } from './_cat.js';
import { concatBytes, encodeUtf8 } from '../../core/util.js';
import { encodeVarint } from './varint_encode.js';
import { Flt, parseJsonTyped } from './_json.js';

function encodeMessage(obj) {
  return concatBytes(Object.entries(obj).map(([k, v]) => encodeValue(k, v)));
}

function encodeValue(field, v) {
  const fn = parseInt(field, 10);
  if (typeof v === 'boolean') return new Uint8Array([fn << 3, v ? 1 : 0]);
  if (typeof v === 'number' || typeof v === 'bigint') return concatBytes([new Uint8Array([fn << 3]), encodeVarint(BigInt(v))]);
  if (v instanceof Flt) {
    const buf = new ArrayBuffer(8);
    new DataView(buf).setFloat64(0, v.v, true);
    return concatBytes([new Uint8Array([(fn << 3) | 1]), new Uint8Array(buf)]);
  }
  if (typeof v === 'string') {
    const b = encodeUtf8(v);
    return concatBytes([new Uint8Array([(fn << 3) | 2]), encodeVarint(BigInt(b.length)), b]);
  }
  if (Array.isArray(v)) return concatBytes(v.map(item => encodeValue(field, item)));
  if (v && typeof v === 'object') {
    const body = encodeMessage(v);
    return concatBytes([new Uint8Array([(fn << 3) | 2]), encodeVarint(BigInt(body.length)), body]);
  }
  throw new Error(`Cannot encode field ${field} of type ${v === null ? 'null' : typeof v}`);
}

module('Protobuf Encode', "Encodes JSON back into a protobuf message. Keys are field numbers ('1', '2', ...); values are int/float/string/nested object/array of any of these - the inverse of Protobuf Decode's schema-less output.", [],
  (t) => {
    const obj = parseJsonTyped(t);
    if (!obj || typeof obj !== 'object' || Array.isArray(obj)) throw new Error('Expected a JSON object with field-number keys, e.g. {"1": "hello", "2": 42}');
    return encodeMessage(obj);
  }, { text: true });
