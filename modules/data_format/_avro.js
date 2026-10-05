import { decodeUtf8 } from '../../core/util.js';
import { streamTransform } from '../compression/_streams.js';

function readZigzagLong(b, i) {
  let result = 0n, shift = 0n, byte;
  do {
    if (i >= b.length) throw new Error('Unexpected end of Avro data');
    byte = b[i++];
    result |= BigInt(byte & 0x7f) << shift;
    shift += 7n;
  } while (byte & 0x80);
  const value = (result >> 1n) ^ -(result & 1n);
  return [value, i];
}

const PRIMITIVES = new Set(['null', 'boolean', 'int', 'long', 'float', 'double', 'bytes', 'string']);

function resolveSchema(schema, namedTypes, namespace) {
  if (typeof schema === 'string') {
    if (PRIMITIVES.has(schema)) return { type: schema };
    const full = schema.includes('.') ? schema : (namespace ? `${namespace}.${schema}` : schema);
    const found = namedTypes[full] || namedTypes[schema];
    if (!found) throw new Error(`Unknown Avro named type: ${schema}`);
    return found;
  }
  if (Array.isArray(schema)) return { type: 'union', branches: schema.map(s => resolveSchema(s, namedTypes, namespace)) };

  const type = schema.type;
  if (type === 'record' || type === 'error') {
    const ns = schema.namespace !== undefined ? schema.namespace : namespace;
    const fullName = ns ? `${ns}.${schema.name}` : schema.name;
    const rec = { type: 'record', name: fullName, fields: [] };
    namedTypes[fullName] = rec;
    rec.fields = (schema.fields || []).map(f => ({ name: f.name, schema: resolveSchema(f.type, namedTypes, ns) }));
    return rec;
  }
  if (type === 'enum') {
    const ns = schema.namespace !== undefined ? schema.namespace : namespace;
    const fullName = ns ? `${ns}.${schema.name}` : schema.name;
    const en = { type: 'enum', name: fullName, symbols: schema.symbols };
    namedTypes[fullName] = en;
    return en;
  }
  if (type === 'fixed') {
    const ns = schema.namespace !== undefined ? schema.namespace : namespace;
    const fullName = ns ? `${ns}.${schema.name}` : schema.name;
    const fx = { type: 'fixed', name: fullName, size: schema.size };
    namedTypes[fullName] = fx;
    return fx;
  }
  if (type === 'array') return { type: 'array', items: resolveSchema(schema.items, namedTypes, namespace) };
  if (type === 'map') return { type: 'map', values: resolveSchema(schema.values, namedTypes, namespace) };
  if (typeof type === 'string' || Array.isArray(type)) return resolveSchema(type, namedTypes, namespace);
  throw new Error(`Unsupported Avro schema type: ${JSON.stringify(schema)}`);
}

function bufferJson(bytes) {
  return { type: 'Buffer', data: Array.from(bytes) };
}

function shapeKind(schema) {
  switch (schema.type) {
    case 'null': return 'null';
    case 'boolean': return 'boolean';
    case 'int': case 'long': case 'float': case 'double': return 'number';
    case 'string': case 'enum': return 'string';
    case 'bytes': case 'fixed': return 'bytes';
    case 'array': return 'array';
    case 'map': case 'record': return 'object';
    case 'union': return 'union';
    default: return schema.type;
  }
}

function decodeValue(schema, b, i) {
  switch (schema.type) {
    case 'null': return [null, i];
    case 'boolean': { if (i >= b.length) throw new Error('Unexpected end of Avro data'); return [b[i] !== 0, i + 1]; }
    case 'int': case 'long': { const [v, ni] = readZigzagLong(b, i); const n = Number(v); return [Number.isSafeInteger(n) ? n : v, ni]; }
    case 'float': { const v = new DataView(b.buffer, b.byteOffset + i, 4).getFloat32(0, true); return [v, i + 4]; }
    case 'double': { const v = new DataView(b.buffer, b.byteOffset + i, 8).getFloat64(0, true); return [v, i + 8]; }
    case 'bytes': { const [len, ni] = readZigzagLong(b, i); const n = Number(len); return [bufferJson(b.subarray(ni, ni + n)), ni + n]; }
    case 'string': { const [len, ni] = readZigzagLong(b, i); const n = Number(len); return [decodeUtf8(b.subarray(ni, ni + n)), ni + n]; }
    case 'fixed': { const n = schema.size; return [bufferJson(b.subarray(i, i + n)), i + n]; }
    case 'enum': { const [idx, ni] = readZigzagLong(b, i); return [schema.symbols[Number(idx)], ni]; }
    case 'array': {
      const arr = [];
      let j = i;
      while (true) {
        let [count, nj] = readZigzagLong(b, j); j = nj;
        let c = Number(count);
        if (c === 0) break;
        if (c < 0) { const [, nj2] = readZigzagLong(b, j); j = nj2; c = -c; }
        for (let k = 0; k < c; k++) { const [v, nj3] = decodeValue(schema.items, b, j); arr.push(v); j = nj3; }
      }
      return [arr, j];
    }
    case 'map': {
      const obj = {};
      let j = i;
      while (true) {
        let [count, nj] = readZigzagLong(b, j); j = nj;
        let c = Number(count);
        if (c === 0) break;
        if (c < 0) { const [, nj2] = readZigzagLong(b, j); j = nj2; c = -c; }
        for (let k = 0; k < c; k++) {
          const [klen, nj3] = readZigzagLong(b, j); const kn = Number(klen);
          const key = decodeUtf8(b.subarray(nj3, nj3 + kn));
          const [v, nj4] = decodeValue(schema.values, b, nj3 + kn);
          obj[key] = v; j = nj4;
        }
      }
      return [obj, j];
    }
    case 'union': {
      const [idx, ni] = readZigzagLong(b, i);
      const branch = schema.branches[Number(idx)];
      if (!branch) throw new Error('Invalid Avro union branch index');
      const [v, nj] = decodeValue(branch, b, ni);
      if (branch.type === 'null') return [null, nj];
      const kinds = schema.branches.map(shapeKind);
      const ambiguous = kinds.filter(k => k === shapeKind(branch)).length > 1;
      if (!ambiguous) return [v, nj];
      const tag = branch.name || branch.type;
      return [{ [tag]: v }, nj];
    }
    case 'record': {
      const obj = {};
      let j = i;
      for (const f of schema.fields) { const [v, nj] = decodeValue(f.schema, b, j); obj[f.name] = v; j = nj; }
      return [obj, j];
    }
    default:
      throw new Error(`Unsupported Avro type: ${schema.type}`);
  }
}

export async function decodeAvroObjectContainerFile(bytes) {
  if (!bytes.length) throw new Error('Please provide an input.');
  if (bytes.length < 4 || bytes[0] !== 0x4f || bytes[1] !== 0x62 || bytes[2] !== 0x6a || bytes[3] !== 0x01) {
    throw new Error('Error parsing Avro file.');
  }
  let i = 4;
  const meta = {};
  while (true) {
    let [count, ni] = readZigzagLong(bytes, i); i = ni;
    let c = Number(count);
    if (c === 0) break;
    if (c < 0) { const [, ni2] = readZigzagLong(bytes, i); i = ni2; c = -c; }
    for (let k = 0; k < c; k++) {
      const [klen, nj] = readZigzagLong(bytes, i); const kn = Number(klen);
      const key = decodeUtf8(bytes.subarray(nj, nj + kn));
      const [vlen, nj2] = readZigzagLong(bytes, nj + kn); const vn = Number(vlen);
      meta[key] = bytes.subarray(nj2, nj2 + vn);
      i = nj2 + vn;
    }
  }

  if (!meta['avro.schema']) throw new Error('Error parsing Avro file.');
  const schema = JSON.parse(decodeUtf8(meta['avro.schema']));
  const codec = meta['avro.codec'] ? decodeUtf8(meta['avro.codec']) : 'null';
  const namedTypes = {};
  const resolved = resolveSchema(schema, namedTypes, undefined);

  i += 16; // sync marker following the header

  const results = [];
  while (i < bytes.length) {
    const [count, ni] = readZigzagLong(bytes, i); i = ni;
    const [size, ni2] = readZigzagLong(bytes, i); i = ni2;
    const n = Number(size);
    const block = bytes.subarray(i, i + n);
    i += n + 16; // skip block bytes + trailing sync marker

    let decompressed;
    if (codec === 'null') decompressed = block;
    else if (codec === 'deflate') decompressed = await streamTransform(block, 'deflate-raw', 'decompress');
    else throw new Error(`unknown codec: ${codec}`); // avsc's BlockDecoder only ships 'null'/'deflate' by default (no 'snappy')

    let j = 0;
    const objCount = Number(count);
    for (let k = 0; k < objCount; k++) { const [v, nj] = decodeValue(resolved, decompressed, j); results.push(v); j = nj; }
  }

  return results;
}
