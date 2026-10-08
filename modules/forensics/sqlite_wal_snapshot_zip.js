// SPDX-License-Identifier: MIT
import { module } from './_cat.js';
import { listZip, zipEntryBytes } from './_zip.js';
import { applySqliteWal } from './_sqlite_wal.js';
function crc32(bytes) {
  let crc = 0xffffffff;
  for (const byte of bytes) {
    crc ^= byte;
    for (let i = 0; i < 8; i++) crc = (crc >>> 1) ^ (crc & 1 ? 0xedb88320 : 0);
  }
  return (crc ^ 0xffffffff) >>> 0;
}
async function sqliteWalSnapshotZip(data) {
  const entries = listZip(data);
  if (new Set(entries.map(e => e.name)).size !== entries.length) throw new Error('ZIP contains duplicate entry names; evidence pairing is ambiguous');
  const candidates = entries.filter(e => !e.name.endsWith('/') && !e.name.endsWith('-shm'));
  const bases = candidates.filter(e => !e.name.endsWith('-wal'));
  const pairs = bases.map(base => ({base, wal: candidates.find(e => e.name === base.name + '-wal')})).filter(x => x.wal);
  if (pairs.length !== 1) throw new Error('ZIP must contain exactly one matching SQLite database and database-wal pair (same path/name + -wal)');
  const {base, wal} = pairs[0];
  for (const e of [base,wal]) {
    if (e.size > 128 * 1048576 || e.compSize > 128 * 1048576) throw new Error('SQLite ZIP entry exceeds 128 MiB safety limit');
    if (e.flags & 1) throw new Error('Encrypted SQLite ZIP entries are unsupported');
  }
  const [dbBytes, walBytes] = await Promise.all([zipEntryBytes(data,base),zipEntryBytes(data,wal)]);
  if (dbBytes.length !== base.size || walBytes.length !== wal.size) throw new Error('ZIP entry decompressed size mismatch');
  if (crc32(dbBytes) !== base.crc32 || crc32(walBytes) !== wal.crc32) throw new Error('ZIP evidence CRC32 mismatch');
  return applySqliteWal(dbBytes,walBytes);
}
module('SQLite WAL Snapshot (ZIP)', 'Input: ZIP containing a raw SQLite database (e.g. History, places.sqlite, Cookies, ActivitiesCache.db) and its matching database-wal in the same ZIP path. Reconstructs a committed standalone SQLite database in memory after validating salts and checksums. Output is raw SQLite bytes for Chrome/Firefox/Windows Timeline parsers. Does not modify evidence. Fails on corruption, uncommitted-only WAL, or incompatible metadata. Maximum 128 MiB per entry.', [], sqliteWalSnapshotZip);
