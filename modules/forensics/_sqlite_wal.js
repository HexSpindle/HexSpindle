// SPDX-License-Identifier: MIT
// Read-only SQLite WAL checkpoint to an isolated in-memory SQLite database image.
// Input is a database and its matching -wal file; never modifies original evidence.
const BOUND = 128 * 1024 * 1024; // prevent unbounded allocation in the browser
const MAGIC = [0x377f0682, 0x377f0683];
function be(b, n) { return new DataView(b.buffer, b.byteOffset + n, 4).getUint32(0, false); }
function little(b, n) { return new DataView(b.buffer, b.byteOffset + n, 4).getUint32(0, true); }
function putBE(b, n, value) { new DataView(b.buffer, b.byteOffset + n, 4).setUint32(0, value, false); }
function checksum(bytes, littleEndian, first = 0, second = 0) {
  if (bytes.length % 8) throw new Error('SQLite WAL checksum data must be 8-byte aligned');
  const word = littleEndian ? little : be;
  let a = first >>> 0, b = second >>> 0;
  for (let i = 0; i < bytes.length; i += 8) {
    a = (a + word(bytes, i) + b) >>> 0;
    b = (b + word(bytes, i + 4) + a) >>> 0;
  }
  return [a, b];
}
const sanePageSize = ps => ps >= 512 && ps <= 65536 && (ps & (ps - 1)) === 0;
function sqlitePageSize(db) { const n = db[16] << 8 | db[17]; return n === 1 ? 65536 : n; }
export function applySqliteWal(db, wal, opts = {}) {
  if (!(db instanceof Uint8Array) || !(wal instanceof Uint8Array)) throw new Error('SQLite WAL requires raw binary database and WAL bytes');
  if (db.length < 100 || new TextDecoder('latin1').decode(db.subarray(0, 16)) !== 'SQLite format 3\0') throw new Error('Missing SQLite database header');
  const ps = sqlitePageSize(db);
  if (!sanePageSize(ps) || db.length % ps) throw new Error('SQLite database has invalid page size or truncated pages');
  if (db.length > BOUND || wal.length > BOUND) throw new Error('SQLite evidence exceeds 128 MiB safety limit');
  if (wal.length < 32) throw new Error('SQLite WAL header is truncated');
  const magic = be(wal, 0), version = be(wal, 4), wps = be(wal, 8) || 1024;
  if (!MAGIC.includes(magic)) throw new Error('SQLite WAL has invalid magic');
  if (version !== 3007000) throw new Error(`Unsupported SQLite WAL version ${version}`);
  if (!sanePageSize(wps) || wps !== ps) throw new Error('SQLite WAL page size does not match database');
  const le = magic === MAGIC[0], salt1 = be(wal, 16), salt2 = be(wal, 20);
  const hsum = checksum(wal.subarray(0, 24), le);
  if (be(wal, 24) !== hsum[0] || be(wal, 28) !== hsum[1]) throw new Error('SQLite WAL header checksum mismatch');
  const frameLen = ps + 24;
  if ((wal.length - 32) % frameLen) throw new Error('SQLite WAL ends with a partial frame');
  const frameCount = (wal.length - 32) / frameLen;
  if (frameCount > 32768) throw new Error('SQLite WAL frame count exceeds safety limit');
  let s1 = hsum[0], s2 = hsum[1], commit = -1, commitPages = 0;
  const frames = [];
  for (let i = 0, off = 32; i < frameCount; i++, off += frameLen) {
    const frame = wal.subarray(off, off + 24), pageNo = be(frame, 0), dbPages = be(frame, 4);
    if (!pageNo || pageNo > BOUND / ps || dbPages > BOUND / ps) throw new Error(`SQLite WAL frame ${i + 1} has invalid page number or database size`);
    if (be(frame, 8) !== salt1 || be(frame, 12) !== salt2) throw new Error(`SQLite WAL frame ${i + 1} has mismatched salts`);
    [s1, s2] = checksum(frame.subarray(0, 8), le, s1, s2);
    [s1, s2] = checksum(wal.subarray(off + 24, off + frameLen), le, s1, s2);
    if (be(frame, 16) !== s1 || be(frame, 20) !== s2) throw new Error(`SQLite WAL frame ${i + 1} checksum mismatch`);
    frames.push([pageNo, off + 24]);
    if (dbPages) { commit = i; commitPages = dbPages; }
  }
  if (commit < 0) throw new Error('SQLite WAL has no committed transaction (no safe snapshot to replay)');
  if (commitPages * ps > BOUND) throw new Error('SQLite committed database exceeds 128 MiB safety limit');
  const out = new Uint8Array(commitPages * ps);
  out.set(db.subarray(0, Math.min(out.length, db.length)));
  let applied = 0;
  for (let i = 0; i <= commit; i++) {
    const [pageNo, off] = frames[i];
    if (pageNo > commitPages) continue; // SQLite truncation discards pages above final db size
    out.set(wal.subarray(off, off + ps), (pageNo - 1) * ps); applied++;
  }
  if (new TextDecoder('latin1').decode(out.subarray(0, 16)) !== 'SQLite format 3\0') throw new Error('Committed SQLite snapshot has invalid database header');
  // Final image is no longer WAL-mode: a standalone SQLite file must not expect a -wal.
  // Change only the two header format-version flags on this derived COPY.
  out[18] = 1; out[19] = 1;
  if (opts.returnMetadata) return {bytes: out, walFrames: frameCount, lastCommitFrame: commit + 1, committedPages: commitPages, appliedFrames: applied};
  return out;
}
