import { module } from './_cat.js';
import { base64Decode, decodeLatin1 } from '../../core/util.js';

// A disassembler for the Python pickle format (all protocols 0-5), modelled on the standard pickletools module.
// It lists the opcode stream without unpickling anything, so it is safe to run on hostile pickles. Opcodes that
// can import or call arbitrary code (the mechanism behind pickle remote code execution) are flagged.
const read = {
  line: (b, i) => { const n = b.indexOf(0x0a, i); return [decodeLatin1(b.subarray(i, n < 0 ? b.length : n)), (n < 0 ? b.length : n) + 1]; },
  u1: (b, i) => [b[i], i + 1], u2: (b, i) => [b[i] | (b[i + 1] << 8), i + 2], u4: (b, i) => [(b[i] | (b[i + 1] << 8) | (b[i + 2] << 16) | (b[i + 3] << 24)) >>> 0, i + 4],
  s1: (b, i) => { const n = b[i]; return [decodeLatin1(b.subarray(i + 1, i + 1 + n)), i + 1 + n]; },
  s4: (b, i) => { const n = (b[i] | (b[i + 1] << 8) | (b[i + 2] << 16) | (b[i + 3] << 24)) >>> 0; return [decodeLatin1(b.subarray(i + 4, i + 4 + n)), i + 4 + n]; },
  s8: (b, i) => { const n = Number(new DataView(b.buffer, b.byteOffset + i, 8).getBigUint64(0, true)); return [`<${n} bytes>`, i + 8 + n]; },
  u8len: (b, i) => { const n = Number(new DataView(b.buffer, b.byteOffset + i, 8).getBigUint64(0, true)); return [`<${n} bytes>`, i + 8 + n]; },
  twoLines: (b, i) => { const [a, j] = read.line(b, i); const [c, k] = read.line(b, j); return [`${a} ${c}`, k]; },
};
// opcode byte -> [name, argument reader or null, note]
const OPS = {
  0x28: ['MARK'], 0x2e: ['STOP'], 0x30: ['POP'], 0x31: ['POP_MARK'], 0x32: ['DUP'], 0x4e: ['NONE'], 0x88: ['NEWTRUE'], 0x89: ['NEWFALSE'],
  0x49: ['INT', read.line], 0x4c: ['LONG', read.line], 0x4a: ['BININT', read.u4], 0x4b: ['BININT1', read.u1], 0x4d: ['BININT2', read.u2],
  0x8a: ['LONG1', read.s1], 0x8b: ['LONG4', read.s4], 0x46: ['FLOAT', read.line], 0x47: ['BINFLOAT', (b, i) => ['<8 bytes>', i + 8]],
  0x53: ['STRING', read.line], 0x54: ['BINSTRING', read.s4], 0x55: ['SHORT_BINSTRING', read.s1], 0x58: ['BINUNICODE', read.s4], 0x8c: ['SHORT_BINUNICODE', read.s1], 0x8d: ['BINUNICODE8', read.u8len],
  0x56: ['UNICODE', read.line], 0x42: ['BINBYTES', read.s4], 0x43: ['SHORT_BINBYTES', read.s1], 0x8e: ['BINBYTES8', read.s8], 0x96: ['BYTEARRAY8', read.s8], 0x97: ['NEXT_BUFFER', null, 'out-of-band buffer'], 0x98: ['READONLY_BUFFER'],
  0x29: ['EMPTY_TUPLE'], 0x74: ['TUPLE'], 0x85: ['TUPLE1'], 0x86: ['TUPLE2'], 0x87: ['TUPLE3'], 0x5d: ['EMPTY_LIST'], 0x6c: ['LIST'], 0x61: ['APPEND'], 0x65: ['APPENDS'],
  0x7d: ['EMPTY_DICT'], 0x64: ['DICT'], 0x73: ['SETITEM'], 0x75: ['SETITEMS'], 0x8f: ['EMPTY_SET'], 0x90: ['ADDITEMS'], 0x91: ['FROZENSET'],
  0x50: ['PERSID', read.line], 0x51: ['BINPERSID'],
  0x63: ['GLOBAL', read.twoLines, 'imports a module attribute'], 0x93: ['STACK_GLOBAL', null, 'imports a module attribute from the stack'],
  0x52: ['REDUCE', null, 'calls a callable with arguments'], 0x62: ['BUILD', null, 'calls __setstate__ / updates __dict__'], 0x6f: ['OBJ', null, 'constructs an object'], 0x69: ['INST', read.twoLines, 'imports and constructs a class'],
  0x81: ['NEWOBJ', null, 'constructs an object via __new__'], 0x92: ['NEWOBJ_EX', null, 'constructs an object via __new__ with kwargs'],
  0x70: ['PUT', read.line], 0x71: ['BINPUT', read.u1], 0x72: ['LONG_BINPUT', read.u4], 0x94: ['MEMOIZE'], 0x67: ['GET', read.line], 0x68: ['BINGET', read.u1], 0x6a: ['LONG_BINGET', read.u4],
  0x80: ['PROTO', read.u1], 0x95: ['FRAME', (b, i) => ['<8-byte length>', i + 8]], 0x5c: ['EXT1', read.u1],
};
const DANGEROUS = new Set([0x63, 0x93, 0x52, 0x62, 0x6f, 0x69, 0x81, 0x92]);

export function disassemblePickle(bytes) {
  const lines = []; let i = 0, proto = 0; const seen = new Set();
  const dangerous = []; const imports = [];
  while (i < bytes.length) {
    const at = i, op = bytes[i++];
    const def = OPS[op];
    if (!def) { lines.push(`${String(at).padStart(6)}: 0x${op.toString(16).padStart(2, '0')} (unknown opcode)`); break; }
    let arg = '';
    if (def[1]) { const [value, next] = def[1](bytes, i); arg = value; i = next; }
    const sym = String.fromCharCode(op).replace(/[^\x20-\x7e]/, '.');
    lines.push(`${String(at).padStart(6)}: ${op.toString(16).padStart(2, '0')} ${sym} ${def[0]}${arg !== '' ? ' ' + (String(arg).length > 70 ? JSON.stringify(String(arg).slice(0, 70)) + '…' : JSON.stringify(arg)) : ''}${DANGEROUS.has(op) ? '   <-- code execution opcode' : ''}`);
    if (op === 0x80) proto = +arg || 0;
    if (DANGEROUS.has(op)) { dangerous.push(def[0]); if ((op === 0x63 || op === 0x69) && arg) imports.push(String(arg).replace(' ', '.')); }
    if (op === 0x2e) break;   // STOP
    seen.add(op);
  }
  const out = [`Python pickle, protocol ${proto}`, '', ...lines, '', `Opcodes: ${lines.length}`];
  if (imports.length) out.push('', 'Imports requested:', ...[...new Set(imports)].map(m => `  - ${m}`));
  if (dangerous.length) out.push('', `WARNING: this pickle uses code-execution opcodes (${[...new Set(dangerous)].join(', ')}).`,
    'Unpickling it runs whatever those opcodes construct or call. Review it here; do not unpickle untrusted data.');
  return out.join('\n');
}

module('Disassemble Python Pickle',
  'Disassembles a Python pickle (protocols 0 to 5) into its opcode stream, like the standard pickletools.dis, without unpickling it — safe to run on an untrusted pickle. '
  + 'Shows every opcode and argument, lists the modules it would import, and flags the opcodes that import or call code (GLOBAL, REDUCE, BUILD and the rest), which is how malicious pickles achieve remote code execution. '
  + 'Accepts raw bytes or Base64.',
  [],
  (data) => {
    let bytes = data;
    const text = decodeLatin1(data.subarray(0, Math.min(data.length, 1 << 20))).trim();
    // Protocol 2+ starts with \x80; protocol 0/1 start with a printable opcode. Base64 is detected by content.
    if (/^[A-Za-z0-9+/=\s]+$/.test(text) && text.length >= 8 && data[0] !== 0x80 && data[0] !== 0x28) { try { bytes = base64Decode(text); } catch { /* keep raw */ } }
    if (!bytes.length) throw new Error('Empty input');
    return disassemblePickle(bytes);
  }, { aliases: ['pickle', 'pickletools', 'unpickle', 'python serialization'] });
