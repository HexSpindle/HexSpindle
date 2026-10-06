import { module } from './_cat.js';
import { A } from '../../core/registry.js';
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

let protobufLib = null;

async function encodeWithSchema(t, schema) {
  if (!protobufLib) protobufLib = import('./_protobufjs.mjs');
  const protobuf = (await protobufLib).default;
  let parsed, mainName = null;
  try {
    parsed = protobuf.parse(schema);
    if (parsed.package) parsed.root = parsed.root.nested[parsed.package];
    const names = parsed.root.nestedArray.filter(b => b instanceof protobuf.Type).map(b => b.name);
    mainName = names.length ? names[0] : null;
  } catch (e) {
    throw new Error('Schema ' + e);
  }
  if (!mainName) throw new Error('Schema Error: Schema not defined');
  const message = parsed.root.nested[mainName];
  const input = message.fromObject(JSON.parse(t));
  const err = message.verify(input);
  if (err) throw new Error('Input Error: ' + err);
  return new Uint8Array(message.encode(input).finish());
}

module('Protobuf Encode', "Encodes JSON into a protobuf message. With a .proto schema, the JSON is the message as named fields and is encoded as the schema's first message type. Without one, keys are field numbers ('1', '2', ...) and values are int/float/string/nested object/array of these - the inverse of Protobuf Decode's schema-less output.",
  [A.area('Schema (.proto text)', '', 'Optional: a .proto schema. Leave empty for schema-less field-number JSON.')],
  async (t, schema = '') => {
    if (schema && schema.trim()) return encodeWithSchema(t, schema);
    const obj = parseJsonTyped(t);
    if (!obj || typeof obj !== 'object' || Array.isArray(obj)) throw new Error('Expected a JSON object with field-number keys, e.g. {"1": "hello", "2": 42}');
    return encodeMessage(obj);
  }, { text: true });
