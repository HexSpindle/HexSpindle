// SPDX-License-Identifier: MIT
// Minimal read-only SQLite b-tree reader for forensic artefacts. Original HexSpindle code.
// Supports ordinary table b-trees and overflow pages; it intentionally does not execute SQL.
import { u16be, u32be, safeJson } from './_common.js';

function varint(b, off) {
  let v = 0n;
  for (let i = 0; i < 9; i++) {
    if (off + i >= b.length) throw new Error('Truncated SQLite varint');
    const x = b[off + i];
    if (i === 8) return [Number((v << 8n) | BigInt(x)), 9];
    v = (v << 7n) | BigInt(x & 0x7f);
    if (!(x & 0x80)) {
      const n = v <= BigInt(Number.MAX_SAFE_INTEGER) ? Number(v) : v;
      return [n, i + 1];
    }
  }
  throw new Error('Invalid SQLite varint');
}
function asNum(v) { return typeof v === 'bigint' ? Number(v) : v; }
function signedBig(bytes) {
  if (!bytes.length) return 0;
  let v = 0n; for (const x of bytes) v = (v << 8n) | BigInt(x);
  const bits = BigInt(bytes.length * 8);
  if (v & (1n << (bits - 1n))) v -= 1n << bits;
  return v >= BigInt(Number.MIN_SAFE_INTEGER) && v <= BigInt(Number.MAX_SAFE_INTEGER) ? Number(v) : v;
}
function float64be(b, off) { return new DataView(b.buffer, b.byteOffset + off, 8).getFloat64(0, false); }

export class SQLiteReader {
  constructor(data) {
    if (new TextDecoder('latin1').decode(data.subarray(0, 16)) !== 'SQLite format 3\u0000') throw new Error('Not a SQLite 3 database');
    this.data = data;
    const rawPs = u16be(data, 16); this.pageSize = rawPs === 1 ? 65536 : rawPs;
    this.reserved = data[20]; this.usable = this.pageSize - this.reserved;
    this.pages = Math.floor(data.length / this.pageSize);
    const enc = u32be(data, 56); this.encoding = enc === 2 ? 'utf-16le' : enc === 3 ? 'utf-16be' : 'utf-8';
    this.decoder = new TextDecoder(this.encoding, { fatal: false });
  }
  page(n) {
    if (!Number.isInteger(n) || n < 1 || n > this.pages) throw new Error(`SQLite page ${n} is out of range`);
    const off = (n - 1) * this.pageSize; return this.data.subarray(off, off + this.pageSize);
  }
  readOverflow(first, bytesNeeded) {
    const parts = []; let p = first, remain = bytesNeeded, guard = 0;
    while (p && remain > 0 && guard++ < this.pages + 2) {
      const pg = this.page(p); const next = u32be(pg, 0); const take = Math.min(remain, this.usable - 4);
      parts.push(pg.subarray(4, 4 + take)); remain -= take; p = next;
    }
    const out = new Uint8Array(bytesNeeded - remain); let o = 0;
    for (const x of parts) { out.set(x, o); o += x.length; }
    return out;
  }
  localPayloadSize(P) {
    const U = this.usable, X = U - 35, M = Math.floor(((U - 12) * 32) / 255) - 23;
    if (P <= X) return P;
    const K = M + ((P - M) % (U - 4));
    return K <= X ? K : M;
  }
  decodeRecord(payload) {
    let [headerSize, hs] = varint(payload, 0); headerSize = asNum(headerSize);
    let h = hs; const types = [];
    while (h < headerSize) { const [t, n] = varint(payload, h); types.push(asNum(t)); h += n; }
    let p = headerSize; const row = [];
    for (const t of types) {
      if (t === 0) row.push(null);
      else if (t === 1) { row.push(signedBig(payload.subarray(p, p + 1))); p += 1; }
      else if (t === 2) { row.push(signedBig(payload.subarray(p, p + 2))); p += 2; }
      else if (t === 3) { row.push(signedBig(payload.subarray(p, p + 3))); p += 3; }
      else if (t === 4) { row.push(signedBig(payload.subarray(p, p + 4))); p += 4; }
      else if (t === 5) { row.push(signedBig(payload.subarray(p, p + 6))); p += 6; }
      else if (t === 6) { row.push(signedBig(payload.subarray(p, p + 8))); p += 8; }
      else if (t === 7) { row.push(float64be(payload, p)); p += 8; }
      else if (t === 8) row.push(0);
      else if (t === 9) row.push(1);
      else if (t >= 12) {
        const len = Math.floor((t - (t % 2 === 0 ? 12 : 13)) / 2);
        const v = payload.subarray(p, p + len); p += len;
        row.push(t % 2 === 0 ? v : this.decoder.decode(v));
      } else row.push(null);
    }
    return row;
  }
  cellPayload(pg, cellOff) {
    let [P, n1] = varint(pg, cellOff); P = asNum(P);
    const [rowid, n2] = varint(pg, cellOff + n1);
    const start = cellOff + n1 + n2; const local = this.localPayloadSize(P);
    if (start + local > pg.length) throw new Error('SQLite cell payload exceeds page');
    if (local === P) return { rowid, payload: pg.subarray(start, start + P) };
    if (start + local + 4 > pg.length) throw new Error('SQLite overflow pointer exceeds page');
    const first = u32be(pg, start + local); const overflow = this.readOverflow(first, P - local);
    const all = new Uint8Array(P); all.set(pg.subarray(start, start + local)); all.set(overflow, local);
    return { rowid, payload: all };
  }
  *walkTable(pageNo, seen = new Set()) {
    if (seen.has(pageNo)) return; seen.add(pageNo);
    const pg = this.page(pageNo); const base = pageNo === 1 ? 100 : 0; const type = pg[base];
    const cells = u16be(pg, base + 3);
    if (type === 0x0d) {
      for (let i = 0; i < cells; i++) {
        const off = u16be(pg, base + 8 + i * 2);
        try { const { rowid, payload } = this.cellPayload(pg, off); yield { rowid, values: this.decodeRecord(payload), page: pageNo, offset: off }; }
        catch (e) { yield { rowid: null, values: [], page: pageNo, offset: off, error: String(e.message || e) }; }
      }
    } else if (type === 0x05) {
      for (let i = 0; i < cells; i++) { const off = u16be(pg, base + 12 + i * 2); const child = u32be(pg, off); yield* this.walkTable(child, seen); }
      const right = u32be(pg, base + 8); if (right) yield* this.walkTable(right, seen);
    } else throw new Error(`Unsupported SQLite b-tree page type 0x${type.toString(16)} at page ${pageNo}`);
  }
  master() {
    const rows = [];
    for (const r of this.walkTable(1)) {
      if (r.values.length >= 5) rows.push({ type: r.values[0], name: r.values[1], tbl_name: r.values[2], rootpage: Number(r.values[3]), sql: r.values[4], rowid: r.rowid });
    }
    return rows;
  }
  columnsFor(name) {
    const row = this.master().find(x => x.type === 'table' && x.name === name); if (!row?.sql) return [];
    const m = /\(([^]*)\)/.exec(String(row.sql)); if (!m) return [];
    const cols = []; let cur = '', quote = '', depth = 0;
    for (const ch of m[1]) {
      if (quote) { cur += ch; if (ch === quote) quote = ''; continue; }
      if (ch === '"' || ch === "'" || ch === '`') { quote = ch; cur += ch; continue; }
      if (ch === '(') depth++; else if (ch === ')') depth--;
      if (ch === ',' && depth === 0) { cols.push(cur); cur = ''; } else cur += ch;
    }
    if (cur.trim()) cols.push(cur);
    return cols.map(s => s.trim()).filter(s => !/^(?:constraint|primary|unique|foreign|check)\b/i.test(s)).map(s => {
      const q = /^(?:"([^"]+)"|`([^`]+)`|\[([^\]]+)\]|([^\s]+))/.exec(s); return q ? (q[1] || q[2] || q[3] || q[4]) : s;
    });
  }
  table(name, limit = 10000) {
    const m = this.master().find(x => x.type === 'table' && x.name === name); if (!m) throw new Error(`SQLite table not found: ${name}`);
    const cols = this.columnsFor(name); const out = [];
    for (const r of this.walkTable(m.rootpage)) {
      if (r.error) { out.push({ _rowid: r.rowid, _error: r.error }); continue; }
      const obj = { _rowid: typeof r.rowid === 'bigint' ? r.rowid.toString() : r.rowid };
      r.values.forEach((v, i) => { const key = cols[i] || `col${i}`; obj[key] = v instanceof Uint8Array ? { hex: [...v.subarray(0, 64)].map(x=>x.toString(16).padStart(2,'0')).join(''), bytes: v.length } : (typeof v === 'bigint' ? v.toString() : v); });
      out.push(obj); if (out.length >= limit) break;
    }
    return out;
  }
  summary() { return { pageSize: this.pageSize, usableSize: this.usable, pages: this.pages, encoding: this.encoding, schema: this.master() }; }
}

export function sqliteInspect(data, table = '', limit = 200) {
  const db = new SQLiteReader(data);
  if (!table) return safeJson(db.summary());
  return safeJson(db.table(table, limit));
}
