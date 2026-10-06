const META_MARKER = Uint8Array.from([0xab, 0xcd, 0xef, 0x4d, 0x61, 0x78, 0x4d, 0x69, 0x6e, 0x64, 0x2e, 0x63, 0x6f, 0x6d]);
const DATA_SECTION_SEPARATOR_SIZE = 16;
const textDecoder = new TextDecoder('utf-8');

function assert(cond, msg) { if (!cond) throw new Error(msg); }
function readUIntBE(u, off, len) {
  assert(off >= 0 && off + len <= u.length, 'MMDB read is outside the file');
  let n = 0;
  for (let i = 0; i < len; i++) n = n * 256 + u[off + i];
  return n;
}
function readBigUIntBE(u, off, len) {
  assert(off >= 0 && off + len <= u.length, 'MMDB read is outside the file');
  let n = 0n;
  for (let i = 0; i < len; i++) n = (n << 8n) | BigInt(u[off + i]);
  return n <= BigInt(Number.MAX_SAFE_INTEGER) ? Number(n) : n.toString();
}
function findMarker(u) {
  const min = Math.max(0, u.length - 131072 - META_MARKER.length);
  outer: for (let i = u.length - META_MARKER.length; i >= min; i--) {
    for (let j = 0; j < META_MARKER.length; j++) if (u[i + j] !== META_MARKER[j]) continue outer;
    return i + META_MARKER.length;
  }
  throw new Error('MaxMind DB metadata marker was not found');
}

class Decoder {
  constructor(bytes, baseOffset = 0, limits = {}) {
    this.u = bytes;
    this.dv = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
    this.baseOffset = baseOffset;
    this.maxDepth = limits.maxDepth ?? 64;
    this.maxValues = limits.maxValues ?? 65536;
    this.maxPayload = limits.maxPayload ?? (2 << 20);
  }
  budget() { return { values: 0, payload: 0, active: new Set() }; }
  decode(offset, budget = this.budget(), depth = 0) {
    if (depth > this.maxDepth) throw new Error('MMDB value nesting limit exceeded');
    if (++budget.values > this.maxValues) throw new Error('MMDB decoded-value limit exceeded');
    assert(offset >= 0 && offset < this.u.length, 'MMDB value offset is outside the file');
    const ctrl = this.u[offset++];
    let type = ctrl >> 5;
    if (type === 1) return this.decodePointer(ctrl, offset, budget, depth);
    if (type === 0) {
      assert(offset < this.u.length, 'Truncated MMDB extended type');
      type = this.u[offset++] + 7;
      if (type < 8) throw new Error('Invalid MMDB extended type');
    }
    const sized = this.sizeFromCtrl(ctrl, offset);
    return this.decodeType(type, sized.offset, sized.size, budget, depth);
  }
  sizeFromCtrl(ctrl, offset) {
    const s = ctrl & 0x1f;
    if (s < 29) return { size: s, offset };
    if (s === 29) { assert(offset < this.u.length, 'Truncated MMDB size'); return { size: 29 + this.u[offset], offset: offset + 1 }; }
    if (s === 30) return { size: 285 + readUIntBE(this.u, offset, 2), offset: offset + 2 };
    return { size: 65821 + readUIntBE(this.u, offset, 3), offset: offset + 3 };
  }
  charge(budget, n) {
    budget.payload += n;
    if (budget.payload > this.maxPayload) throw new Error('MMDB decoded-payload limit exceeded');
  }
  decodePointer(ctrl, offset, budget, depth) {
    const size = (ctrl >> 3) & 3;
    const offs = [0, 2048, 526336, 0];
    let packed;
    if (size === 0) packed = ((ctrl & 7) << 8) | readUIntBE(this.u, offset, 1);
    else if (size === 1) packed = ((ctrl & 7) << 16) | readUIntBE(this.u, offset, 2);
    else if (size === 2) packed = ((ctrl & 7) << 24) + readUIntBE(this.u, offset, 3);
    else packed = readUIntBE(this.u, offset, 4);
    const next = offset + size + 1;
    const target = this.baseOffset + offs[size] + packed;
    if (budget.active.has(target)) throw new Error('MMDB pointer cycle detected');
    budget.active.add(target);
    const value = this.decode(target, budget, depth + 1).value;
    budget.active.delete(target);
    return { value, offset: next };
  }
  decodeType(type, offset, size, budget, depth) {
    const end = offset + size;
    assert(end <= this.u.length, 'Truncated MMDB value');
    switch (type) {
      case 2: this.charge(budget, size); return { value: textDecoder.decode(this.u.subarray(offset, end)), offset: end };
      case 3: assert(size === 8, 'Invalid MMDB double size'); return { value: this.dv.getFloat64(offset, false), offset: end };
      case 4: this.charge(budget, size); return { value: this.u.subarray(offset, end), offset: end };
      case 5: return { value: readUIntBE(this.u, offset, size), offset: end };
      case 6: return { value: readUIntBE(this.u, offset, size), offset: end };
      case 7: return this.decodeMap(size, offset, budget, depth);
      case 8: {
        if (!size) return { value: 0, offset: end };
        if (size < 4) return { value: readUIntBE(this.u, offset, size), offset: end };
        assert(size === 4, 'Invalid MMDB int32 size');
        return { value: this.dv.getInt32(offset, false), offset: end };
      }
      case 9: return { value: readBigUIntBE(this.u, offset, size), offset: end };
      case 10: return { value: readBigUIntBE(this.u, offset, size), offset: end };
      case 11: return this.decodeArray(size, offset, budget, depth);
      case 13: return { value: null, offset };
      case 14: return { value: size !== 0, offset };
      case 15: assert(size === 4, 'Invalid MMDB float size'); return { value: this.dv.getFloat32(offset, false), offset: end };
      default: throw new Error(`Unsupported MMDB data type ${type}`);
    }
  }
  decodeMap(size, offset, budget, depth) {
    const out = {};
    for (let i = 0; i < size; i++) {
      const k = this.decode(offset, budget, depth + 1); offset = k.offset;
      const v = this.decode(offset, budget, depth + 1); offset = v.offset;
      out[String(k.value)] = v.value;
    }
    return { value: out, offset };
  }
  decodeArray(size, offset, budget, depth) {
    const out = new Array(size);
    for (let i = 0; i < size; i++) { const v = this.decode(offset, budget, depth + 1); offset = v.offset; out[i] = v.value; }
    return { value: out, offset };
  }
}

function parseIPv4(s) {
  const p = s.split('.');
  if (p.length !== 4 || p.some(x => !/^\d{1,3}$/.test(x) || +x > 255)) return null;
  return Uint8Array.from(p.map(Number));
}
function parseIPv6(s) {
  s = s.split('%')[0];
  if (!s.includes(':')) return null;
  if (s.includes('.')) {
    const m = s.match(/(\d+\.\d+\.\d+\.\d+)$/); if (!m) return null;
    const v4 = parseIPv4(m[1]); if (!v4) return null;
    s = s.slice(0, -m[1].length) + ((v4[0] << 8) | v4[1]).toString(16) + ':' + ((v4[2] << 8) | v4[3]).toString(16);
  }
  if ((s.match(/::/g) || []).length > 1) return null;
  const [l, r = ''] = s.split('::');
  const left = l ? l.split(':') : [], right = r ? r.split(':') : [];
  if ((!s.includes('::') && left.length !== 8) || left.length + right.length > 8) return null;
  if ([...left, ...right].some(x => !/^[0-9a-f]{1,4}$/i.test(x))) return null;
  const fill = new Array(8 - left.length - right.length).fill('0');
  const words = [...left, ...fill, ...right].map(x => parseInt(x, 16));
  if (words.length !== 8) return null;
  const out = new Uint8Array(16);
  words.forEach((w, i) => { out[i * 2] = w >> 8; out[i * 2 + 1] = w & 255; });
  return out;
}
export function parseIp(ip) { ip = String(ip).trim(); return ip.includes(':') ? parseIPv6(ip) : parseIPv4(ip); }
export function isIp(ip) { return !!parseIp(ip); }
function bitAt(raw, idx) { return (raw[idx >> 3] >>> (7 ^ (idx & 7))) & 1; }

export class MmdbReader {
  constructor(input, opts = {}) {
    const bytes = input instanceof Uint8Array ? input : new Uint8Array(input);
    this.bytes = bytes;
    const metaOff = findMarker(bytes);
    const metadataRaw = new Decoder(bytes, metaOff, opts.limits).decode(metaOff).value;
    assert(metadataRaw && typeof metadataRaw === 'object', 'Could not parse MMDB metadata');
    assert([24, 28, 32].includes(metadataRaw.record_size), `Unsupported MMDB record size ${metadataRaw.record_size}`);
    this.metadata = {
      binaryFormatMajorVersion: metadataRaw.binary_format_major_version,
      binaryFormatMinorVersion: metadataRaw.binary_format_minor_version,
      buildEpoch: Number(metadataRaw.build_epoch || 0),
      databaseType: String(metadataRaw.database_type || ''),
      description: metadataRaw.description || {},
      ipVersion: Number(metadataRaw.ip_version),
      languages: metadataRaw.languages || [],
      nodeCount: Number(metadataRaw.node_count),
      recordSize: Number(metadataRaw.record_size),
    };
    assert(this.metadata.binaryFormatMajorVersion === 2, `Unsupported MMDB binary format ${this.metadata.binaryFormatMajorVersion}`);
    assert([4, 6].includes(this.metadata.ipVersion), `Unsupported MMDB IP version ${this.metadata.ipVersion}`);
    this.nodeByteSize = this.metadata.recordSize / 4;
    this.searchTreeSize = this.metadata.nodeCount * this.nodeByteSize;
    assert(this.searchTreeSize + DATA_SECTION_SEPARATOR_SIZE < bytes.length, 'MMDB search tree exceeds the file size');
    this.decoder = new Decoder(bytes, this.searchTreeSize + DATA_SECTION_SEPARATOR_SIZE, opts.limits);
    this.ipv4StartNode = this.findIpv4Start();
  }
  readNode(node, right) {
    const o = node * this.nodeByteSize;
    assert(o >= 0 && o + this.nodeByteSize <= this.searchTreeSize, 'MMDB tree node is outside the search tree');
    if (this.metadata.recordSize === 24) return readUIntBE(this.bytes, o + (right ? 3 : 0), 3);
    if (this.metadata.recordSize === 28) {
      return right
        ? ((this.bytes[o + 3] & 0x0f) << 24) + readUIntBE(this.bytes, o + 4, 3)
        : ((this.bytes[o + 3] & 0xf0) << 20) + readUIntBE(this.bytes, o, 3);
    }
    return readUIntBE(this.bytes, o + (right ? 4 : 0), 4);
  }
  findIpv4Start() {
    if (this.metadata.ipVersion === 4) return 0;
    let node = 0;
    for (let i = 0; i < 96 && node < this.metadata.nodeCount; i++) node = this.readNode(node, false);
    return node;
  }
  getWithPrefixLength(ip) {
    const raw = parseIp(ip); if (!raw) throw new Error(`Invalid IP address: ${ip}`);
    if (raw.length === 16 && this.metadata.ipVersion === 4) return [null, 0];
    let node = raw.length === 4 ? this.ipv4StartNode : 0;
    let depth = 0;
    for (; depth < raw.length * 8 && node < this.metadata.nodeCount; depth++) node = this.readNode(node, !!bitAt(raw, depth));
    if (node <= this.metadata.nodeCount) return [null, depth];
    const resolved = node - this.metadata.nodeCount + this.searchTreeSize;
    return [this.decoder.decode(resolved).value, depth];
  }
  get(ip) { return this.getWithPrefixLength(ip)[0]; }
}

export function inspectMmdb(input) {
  const reader = new MmdbReader(input);
  return { ...reader.metadata, searchTreeSize: reader.searchTreeSize };
}
