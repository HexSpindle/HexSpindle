import { module } from './_cat.js';
import { A } from '../../core/registry.js';
import { md5 } from '../encryption_encoding/_hashes.js';

const VALID = /^(?:[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}|00000000-0000-0000-0000-000000000000|ffffffff-ffff-ffff-ffff-ffffffffffff)$/i;
const hex = b => [...b].map(x => x.toString(16).padStart(2, '0')).join('');
const fmt = b => { const h = hex(b); return `${h.slice(0, 8)}-${h.slice(8, 12)}-${h.slice(12, 16)}-${h.slice(16, 20)}-${h.slice(20)}`; };
const rng = () => crypto.getRandomValues(new Uint8Array(16));

function v1Bytes(rnds, msecs, nsecs, clockseq, node) {
  const b = new Uint8Array(16);
  msecs += 12219292800000;
  const t = (msecs & 0xfffffff) * 10000 + nsecs, tl = t >>> 0;
  b[0] = tl >>> 24; b[1] = tl >>> 16; b[2] = tl >>> 8; b[3] = tl;
  const tmh = (((msecs / 0x10000000) | 0) * 625 + ((t / 0x100000000) | 0)) & 0xfffffff;
  b[4] = tmh >>> 8; b[5] = tmh; b[6] = ((tmh >>> 24) & 0xf) | 0x10; b[7] = tmh >>> 16;
  b[8] = (clockseq >>> 8) | 0x80; b[9] = clockseq; b.set(node, 10);
  return b;
}
const v1ToV6 = v => Uint8Array.of(((v[6] & 0x0f) << 4) | ((v[7] >> 4) & 0x0f), ((v[7] & 0x0f) << 4) | ((v[4] & 0xf0) >> 4), ((v[4] & 0x0f) << 4) | ((v[5] & 0xf0) >> 4),
  ((v[5] & 0x0f) << 4) | ((v[0] & 0xf0) >> 4), ((v[0] & 0x0f) << 4) | ((v[1] & 0xf0) >> 4), ((v[1] & 0x0f) << 4) | ((v[2] & 0xf0) >> 4), 0x60 | (v[2] & 0x0f), v[3], ...v.subarray(8));

function makeGenerators() {
  const s1 = { msecs: -Infinity, nsecs: 0 }, s7 = { msecs: -Infinity, seq: 0 };
  const v1 = (v6) => {
    const now = Date.now(), r = rng();
    if (now === s1.msecs) { if (++s1.nsecs >= 10000) { s1.node = undefined; s1.nsecs = 0; } } else if (now > s1.msecs) s1.nsecs = 0; else s1.node = undefined;
    if (!s1.node) { s1.node = r.slice(10, 16); s1.node[0] |= 0x01; s1.clockseq = ((r[8] << 8) | r[9]) & 0x3fff; }
    s1.msecs = now;
    let node = s1.node, clockseq = s1.clockseq;
    if (v6) { node = r.slice(10, 16); node[0] |= 0x01; clockseq = ((r[8] << 8) | r[9]) & 0x3fff; }
    const b = v1Bytes(r, s1.msecs, s1.nsecs, clockseq, node);
    return v6 ? v1ToV6(b) : b;
  };
  const v7 = () => {
    const now = Date.now(), r = rng();
    if (now > s7.msecs) { s7.seq = ((r[6] & 0x7f) << 24) | (r[7] << 16) | (r[8] << 8) | r[9]; s7.msecs = now; }
    else { s7.seq = (s7.seq + 1) | 0; if (s7.seq === 0) s7.msecs++; }
    const m = s7.msecs, q = s7.seq, b = new Uint8Array(16);
    b[0] = (m / 0x10000000000) & 0xff; b[1] = (m / 0x100000000) & 0xff; b[2] = (m / 0x1000000) & 0xff; b[3] = (m / 0x10000) & 0xff; b[4] = (m / 0x100) & 0xff; b[5] = m & 0xff;
    b[6] = 0x70 | ((q >>> 28) & 0x0f); b[7] = q >>> 20; b[8] = 0x80 | ((q >>> 14) & 0x3f); b[9] = q >>> 6; b[10] = ((q << 2) & 0xff) | (r[10] & 0x03);
    b.set(r.subarray(11, 16), 11);
    return b;
  };
  return { v1: () => v1(false), v6: () => v1(true), v7, v4: () => { const b = rng(); b[6] = (b[6] & 0x0f) | 0x40; b[8] = (b[8] & 0x3f) | 0x80; return b; } };
}

async function v35(version, name, namespace) {
  const ns = Uint8Array.from(namespace.replace(/-/g, '').match(/../g), h => parseInt(h, 16));
  const nameBytes = new TextEncoder().encode(name);
  const all = new Uint8Array(16 + nameBytes.length); all.set(ns); all.set(nameBytes, 16);
  const b = (version === 0x30 ? md5(all) : new Uint8Array(await crypto.subtle.digest('SHA-1', all))).slice(0, 16);
  b[6] = (b[6] & 0x0f) | version; b[8] = (b[8] & 0x3f) | 0x80;
  return b;
}

module('Generate UUID', 'Generates UUIDs of the chosen version (v1, v3, v4, v5, v6, v7). v3 and v5 are name-based: the input is the name, hashed with the Namespace UUID; the other versions ignore the input.',
  [A.number('Count', 1, 1, 1000), A.boolean('Uppercase', false), A.select('Version', ['v1', 'v3', 'v4', 'v5', 'v6', 'v7'], 'v4'),
    A.string('Namespace', '1b671a64-40d5-491e-99b0-da01ff1f3341', 'UUID namespace (used by v3 and v5)')],
  async (t, count, upper, version = 'v4', namespace = '1b671a64-40d5-491e-99b0-da01ff1f3341') => {
    const gens = makeGenerators();
    let make;
    if (version === 'v3' || version === 'v5') {
      if (typeof namespace !== 'string' || !VALID.test(namespace)) throw new Error('Invalid UUID namespace');
      const b = await v35(version === 'v3' ? 0x30 : 0x50, t, namespace);
      make = () => b;
    } else if (gens[version]) make = gens[version];
    else throw new Error('Invalid UUID version');
    return Array.from({ length: count }, () => { const u = fmt(make()); return upper ? u.toUpperCase() : u; }).join('\n');
  }, { text: true, nondeterministic: true });
