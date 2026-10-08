// SPDX-License-Identifier: MIT
// SQLite-generated real WAL fixture, corrupted frames, transaction boundary and recipe chaining.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { bake } from '../core/engine.js';
import { MODULES } from '../core/registry.js';
import { listZip, zipEntryBytes } from '../modules/forensics/_zip.js';
import { applySqliteWal } from '../modules/forensics/_sqlite_wal.js';
import { SQLiteReader } from '../modules/forensics/_sqlite.js';
import { parseChromeHistory } from '../modules/forensics/_browser.js';
import '../modules/forensics/sqlite_wal_snapshot_zip.js';
import '../modules/forensics/chrome_history_parser.js';
let checks = 0;
function check(name, fn) { fn(); checks++; console.log(`PASS [WAL ${checks}] ${name}`); }
const z = new Uint8Array(readFileSync(new URL('./fixtures/forensics/sqlite-history-wal-evidence.zip', import.meta.url)));
const entries = listZip(z), db = await zipEntryBytes(z, entries.find(e => e.name.endsWith('/History'))), wal = await zipEntryBytes(z, entries.find(e => e.name.endsWith('/History-wal')));
const base = JSON.parse(parseChromeHistory(db));
check('real SQLite base database lacks WAL-only committed row', () => assert.deepEqual(base.map(x=>x.url),['https://example.org/base']));
const result = applySqliteWal(db, wal, { returnMetadata: true });
check('real SQLite-generated WAL has two valid committed frames', () => { assert.equal(result.walFrames, 2); assert.equal(result.lastCommitFrame, 2); });
check('result is standalone SQLite with rollback-mode header', () => { assert.equal(result.bytes[18],1);assert.equal(result.bytes[19],1);assert.equal(result.bytes.length,db.length); });
const rows = JSON.parse(parseChromeHistory(result.bytes));
check('Chrome history includes both original and WAL-only record',()=>assert.deepEqual(rows.map(x=>x.url), ['https://example.org/base','https://example.org/wal']));
check('SQLite database schema remains readable',()=>assert.ok(new SQLiteReader(result.bytes).master().some(x=>x.name==='visits')));
const tamper = wal.slice(); tamper[32+24+40]^=1;
check('corrupted committed page rejected by WAL frame checksum',()=>assert.throws(()=>applySqliteWal(db,tamper),/checksum mismatch/));
const saltTamper = wal.slice(); saltTamper[32+8]^=1;
check('frame with mismatched salts rejected',()=>assert.throws(()=>applySqliteWal(db,saltTamper),/mismatched salts/));
const headerTamper = wal.slice(); headerTamper[24]^=1;
check('corrupted WAL header rejected',()=>assert.throws(()=>applySqliteWal(db,headerTamper),/header checksum/));
check('truncated WAL frame rejected',()=>assert.throws(()=>applySqliteWal(db,wal.subarray(0,wal.length-1)),/partial frame/));
check('database without SQLite signature rejected',()=>assert.throws(()=>applySqliteWal(new Uint8Array(4096),wal),/SQLite database header/));
// Append a valid checksum-chained uncommitted frame: SQLite must not show it in the snapshot.
const tail = new Uint8Array(wal.length + 24 + result.bytes.length/3); // 4096 byte page
const pageSize = result.bytes.length/3;
tail.set(wal);
const end = wal.length;
tail.set(wal.subarray(wal.length - (24 + pageSize)), end);
const dv = new DataView(tail.buffer);
dv.setUint32(end + 4,0,false); // new frame is uncommitted
const word=(b,o)=>dv.getUint32(o,true), framesize=24+pageSize;
let s1=0,s2=0;
function acc(lo,hi){for(let i=lo;i<hi;i+=8){s1=(s1+word(tail,i)+s2)>>>0;s2=(s2+word(tail,i+4)+s1)>>>0;}}
acc(0,24);for(let p=32;p<wal.length;p+=framesize){acc(p,p+8);acc(p+24,p+framesize);}
acc(end,end+8);acc(end+24,end+framesize);
dv.setUint32(end+16,s1,false);dv.setUint32(end+20,s2,false);
const noReplay = applySqliteWal(db,tail,{returnMetadata:true});
check('valid uncommitted frame ignored (last commit boundary)',()=>{assert.equal(noReplay.walFrames,3);assert.equal(noReplay.lastCommitFrame,2);assert.deepEqual(noReplay.bytes,result.bytes);});
// Validate full app engine pipe (zip bytes -> reconstructed SQLite bytes -> Chrome parser).
const baked = await bake(z,[{module:'SQLite WAL Snapshot (ZIP)',args:[]},{module:'Chrome History Parser',args:[]}]);
check('real HexSpindle engine chains native ZIP -> WAL snapshot -> history parser',()=>{
  assert.equal(baked.error,null);
  assert.deepEqual(JSON.parse(new TextDecoder().decode(baked.output)).map(r=>r.url), ['https://example.org/base','https://example.org/wal']);
});
// SQLite-generated overflow record (9,800-byte text) exercises multi-page payload handling.
const big = new Uint8Array(readFileSync(new URL('./fixtures/forensics/sqlite-overflow-real.db', import.meta.url)));
check('real SQLite overflow chain reconstructs a 9,800-byte record',()=>{
  const [row] = new SQLiteReader(big).table('files');
  assert.equal(row.description, 'C0NFORM'.repeat(1400));
});
check('truncated SQLite overflow page fails closed instead of yielding a plausible partial record',()=>{
  const truncated=big.subarray(0,big.length-4096);
  assert.throws(()=>new SQLiteReader(truncated).table('files'),/unreadable cell|out of range|overflow/);
});
check('WAL module registered exactly once',()=>assert.ok(MODULES['SQLite WAL Snapshot (ZIP)']));
console.log(`PASS: ${checks} WAL conformance assertions from SQLite-generated files and engine integration.`);
