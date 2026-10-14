import { module } from './_cat.js';
import { base64Decode, decodeLatin1, bytesToHex } from '../../core/util.js';

// A read-only walk of the Java serialization stream (JDK Object Serialization, magic AC ED). It reports the
// structure — class names, field types, handles and gadget-chain markers — without constructing any object.
const TC = { 0x70: 'null', 0x71: 'reference', 0x72: 'classDesc', 0x73: 'object', 0x74: 'string', 0x75: 'array', 0x76: 'class', 0x77: 'blockData', 0x78: 'endBlockData', 0x79: 'reset',
  0x7a: 'blockDataLong', 0x7b: 'exception', 0x7c: 'longString', 0x7d: 'proxyClassDesc', 0x7e: 'enum' };
const PRIMS = { B: 'byte', C: 'char', D: 'double', F: 'float', I: 'int', J: 'long', S: 'short', Z: 'boolean' };
// Class names that signal a known deserialization gadget chain.
const GADGETS = [/InvokerTransformer/, /TemplatesImpl/, /AnnotationInvocationHandler/, /PriorityQueue/, /BadAttributeValueExpException/, /\$LazyMap/, /ChainedTransformer/, /CommonsCollections/, /CommonsBeanutils/,
  /BeanComparator/, /Spring.*(?:MethodInvoking|ObjectFactory)/, /JdbcRowSetImpl/, /SignedObject/, /ysoserial/, /Runtime/, /ProcessBuilder/, /groovy\.util\.Expando/, /clojure\./, /HotSwappableTargetSource/];

export function inspectJava(bytes) {
  if (bytes.length < 4 || bytes[0] !== 0xac || bytes[1] !== 0xed) throw new Error('Not a Java serialized stream (does not begin with AC ED)');
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  let i = 2;
  const version = view.getUint16(i); i += 2;
  const lines = [`Java serialized object, stream version ${version}`];
  const classes = new Set();
  let handle = 0x7e0000, depth = 0, guard = 0;
  const u1 = () => bytes[i++], u2 = () => { i += 2; return view.getUint16(i - 2); }, u4 = () => { i += 4; return view.getUint32(i - 2 - 2); };
  const utf = () => { const n = u2(); const s = decodeLatin1(bytes.subarray(i, i + n)); i += n; return s; };
  const emit = (text) => lines.push('  '.repeat(Math.max(0, depth)) + text);
  const content = () => {
    if (i >= bytes.length || guard++ > 100000) return false;
    const tag = u1();
    switch (tag) {
      case 0x74: { const s = utf(); emit(`string #${(handle++).toString(16)}: ${JSON.stringify(s.length > 80 ? s.slice(0, 80) + '…' : s)}`); return true; }
      case 0x7c: { const n = Number(view.getBigUint64(i)); i += 8; const s = decodeLatin1(bytes.subarray(i, i + n)); i += n; emit(`long string #${(handle++).toString(16)} (${n} bytes)`); return true; }
      case 0x71: { const ref = u4(); emit(`reference to handle #${ref.toString(16)}`); return true; }
      case 0x70: emit('null'); return true;
      case 0x73: { emit(`object #${(handle++).toString(16)}:`); depth++; classDesc(); values(); depth--; return true; }
      case 0x72: case 0x7d: { i--; classDesc(); return true; }
      case 0x75: { emit(`array #${(handle++).toString(16)}:`); depth++; classDesc(); const n = u4(); emit(`${n} elements`); depth--; return true; }
      case 0x77: case 0x7a: { const n = tag === 0x77 ? u1() : u4(); emit(`block data, ${n} bytes: ${bytesToHex(bytes.subarray(i, i + Math.min(n, 24)))}${n > 24 ? '…' : ''}`); i += n; return true; }
      case 0x7e: { emit(`enum #${(handle++).toString(16)}:`); depth++; classDesc(); content(); depth--; return true; }
      default: emit(`(${TC[tag] || 'tag 0x' + tag.toString(16)})`); return tag !== 0x78 && tag !== 0x79;
    }
  };
  const classDesc = () => {
    const tag = u1();
    if (tag === 0x70) { emit('class: null'); return; }
    if (tag === 0x71) { emit(`class: reference to #${u4().toString(16)}`); return; }
    if (tag === 0x7d) { emit('dynamic proxy class'); handle++; const n = u4(); for (let k = 0; k < n; k++) emit(`proxy interface: ${utf()}`); classAnnotationAndSuper(); return; }
    if (tag !== 0x72) { i--; return; }
    const name = utf(); i += 8;   // serialVersionUID
    classes.add(name);
    emit(`class #${(handle++).toString(16)}: ${name}${GADGETS.some(g => g.test(name)) ? '   <-- known gadget-chain class' : ''}`);
    const flags = u1(); const nFields = u2();
    depth++;
    for (let f = 0; f < nFields; f++) {
      const type = String.fromCharCode(u1()); const fname = utf();
      let typeName = PRIMS[type] || 'object';
      if (type === 'L' || type === '[') { const tag2 = u1(); if (tag2 === 0x74 || tag2 === 0x7c) { typeName = utf().replace(/^L|;$/g, '').replace(/\//g, '.'); } else if (tag2 === 0x71) { typeName = `ref #${u4().toString(16)}`; } handle += (tag2 === 0x74) ? 1 : 0; }
      emit(`field: ${typeName} ${fname}`);
    }
    depth--;
    classAnnotationAndSuper();
  };
  const classAnnotationAndSuper = () => { while (i < bytes.length && bytes[i] !== 0x78) { if (!content()) break; } if (bytes[i] === 0x78) i++; emit('superclass:'); depth++; classDesc(); depth--; };
  const values = () => { let n = 0; while (i < bytes.length && bytes[i] !== 0x78 && n++ < 500) { if (!content()) break; } if (bytes[i] === 0x78) i++; };
  while (i < bytes.length && content() && guard < 100000) { /* top-level contents */ }
  const flagged = [...classes].filter(c => GADGETS.some(g => g.test(c)));
  lines.push('', `Classes referenced: ${classes.size}`);
  if (flagged.length) lines.push('', 'WARNING: classes associated with known deserialization gadget chains were found:', ...flagged.map(c => `  - ${c}`),
    'This stream, if deserialized by a vulnerable application, may execute code. Analyse it, do not deserialize it.');
  return lines.join('\n');
}

module('Inspect Java Serialized Object',
  'Walks a Java serialized object stream (the AC ED 00 05 format produced by ObjectOutputStream, and carried in RMI, JMX, some cookies and T3/IIOP traffic) and reports its structure — '
  + 'classes, field names and types, strings, arrays and handles — without deserializing it. Classes belonging to known deserialization gadget chains (Commons Collections, ysoserial and others) are flagged. '
  + 'Accepts raw bytes, hex or Base64. This reads the data only; it never constructs an object.',
  [],
  (data) => {
    let bytes = data;
    const text = decodeLatin1(data.subarray(0, Math.min(data.length, 1 << 20))).trim();
    if (/^[A-Za-z0-9+/=\s]+$/.test(text) && text.length >= 8 && !(data[0] === 0xac && data[1] === 0xed)) { try { const b = base64Decode(text); if (b[0] === 0xac && b[1] === 0xed) bytes = b; } catch { /* keep raw */ } }
    if (/^[0-9a-fA-F\s]+$/.test(text) && /aced/i.test(text.replace(/\s/g, '').slice(0, 8))) bytes = Uint8Array.from(text.replace(/\s/g, '').match(/../g), h => parseInt(h, 16));
    return inspectJava(bytes);
  }, { aliases: ['java deserialization', 'serialized', 'ysoserial', 'objectinputstream', 'aced0005'] });
