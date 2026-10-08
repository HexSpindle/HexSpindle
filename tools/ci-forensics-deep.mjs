// SPDX-License-Identifier: MIT
// Targeted acceptance tests for conservative recovery and Authenticode image digest.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { replayRegistryLogs,marvin32 } from '../modules/forensics/_reg_log.js';
import { sqliteDeletedCandidates } from '../modules/forensics/_sqlite_recovery.js';
import { peAuthenticodeImageHash } from '../modules/forensics/_authentihash.js';
import { parseRegistryHive,parsePrefetch } from '../modules/forensics/_windows.js';
import { convertEvtx } from '../modules/forensics/_evtx_binxml.js';
import { bake } from '../core/engine.js';
import { MODULES } from '../core/registry.js';
import '../modules/forensics/sqlite_freelist_candidates.js';
import '../modules/forensics/evtx_salvage_report.js';
import '../modules/forensics/registry_hive_transaction_replay_zip.js';
import '../modules/forensics/pe_authenticode_image_hash.js';
import '../modules/forensics/windows_registry_hive_inspector.js';
let tests=0;function ok(name,f){try{f();tests++;console.log(`PASS [DEEP ${tests}] ${name}`);}catch(e){console.error(`FAIL ${name}: ${e.message}`);throw e;}}
const u=(b,o)=>new DataView(b.buffer,b.byteOffset,b.byteLength).getUint32(o,true);
const put=(b,o,x)=>new DataView(b.buffer,b.byteOffset,b.byteLength).setUint32(o,x,true);
const pu64=(b,o,x)=>new DataView(b.buffer,b.byteOffset,b.byteLength).setBigUint64(o,x,true);
const word=(b,o,str)=>b.set(new TextEncoder().encode(str),o);
function checksum(b){let v=0;for(let p=0;p<0x1fc;p+=4)v^=u(b,p);return v>>>0;}
// Controlled regf hive with actual HBIN + allocated NK root; old snapshot named BEFORE.
function makeHive(name){let h=new Uint8Array(8192);word(h,0,'regf');put(h,4,10);put(h,8,9);put(h,0x24,0x20);put(h,0x28,4096);word(h,4096,'hbin');put(h,4100,0);put(h,4104,4096);const p=4096+0x20;
 put(h,p,0xffffffa0);word(h,p+4,'nk');new DataView(h.buffer).setUint16(p+6,0x20,true);put(h,p+4+0x1c,0xffffffff);put(h,p+4+0x28,0xffffffff);new DataView(h.buffer).setUint16(p+4+0x48,name.length,true);word(h,p+4+0x4c,name);put(h,0x1fc,checksum(h));return h;}
const hive=makeHive('BEFORE');
ok('dirty fixture is a valid REGF base-block and fails without replay',()=>{assert.throws(()=>parseRegistryHive(hive),/Dirty registry/);assert.throws(()=>replayRegistryLogs(hive,{}),/.LOG1\/.LOG2/);});
// Synthesized HvLE transactions with genuine Marvin32 checksums and 512-byte alignment.
function makeLog(seq,newName,mutator){const copy=makeHive(newName),page=copy.subarray(4096,4608),size=1024,entry=new Uint8Array(size);word(entry,0,'HvLE');put(entry,4,size);put(entry,12,seq);put(entry,16,4096);put(entry,20,1);put(entry,40,0);put(entry,44,512);entry.set(page,48);if(mutator)mutator(entry);pu64(entry,24,marvin32(entry.subarray(40)));pu64(entry,32,marvin32(entry.subarray(0,32)));const log=new Uint8Array(512+size);log.set(hive.subarray(0,512));put(log,0x1c,6);put(log,0x1fc,checksum(log));log.set(entry,512);return log;}
const l1=makeLog(10,'AFTER');
const recovered=replayRegistryLogs(hive,{LOG1:l1},{details:true});
ok('HvLE replay reconstructs clean hive root from dirty input',()=>{assert.equal(recovered.applied,1);assert.equal(u(recovered.bytes,4),10);assert.equal(u(recovered.bytes,8),10);assert.match(parseRegistryHive(recovered.bytes),/AFTER/);});
ok('modern HvLE data hash tampering rejected',()=>{const bad=l1.slice();bad[512+48+100]^=1;assert.throws(()=>replayRegistryLogs(hive,{LOG1:bad}),/Marvin32/);});
ok('registry transaction log base-block tampering rejected',()=>{const bad=l1.slice();bad[0x7f]^=1;assert.throws(()=>replayRegistryLogs(hive,{LOG1:bad}),/checksum/);});
ok('mismatched hive/log identity rejected',()=>{const bad=l1.slice();put(bad,0x24,0x200);put(bad,0x1fc,checksum(bad));assert.throws(()=>replayRegistryLogs(hive,{LOG1:bad}),/does not match/);});
ok('modern HvLE header hash tampering rejected',()=>{const bad=l1.slice();bad[512+8]^=1;assert.throws(()=>replayRegistryLogs(hive,{LOG1:bad}),/Marvin32/);});
ok('missing first required registry sequence rejected',()=>assert.throws(()=>replayRegistryLogs(hive,{LOG1:makeLog(12,'LATE')}),/Missing first/));
ok('unsupported legacy registry log rejected',()=>{const old=l1.slice();put(old,0x1c,1);assert.throws(()=>replayRegistryLogs(hive,{LOG1:old}),/legacy/);});
ok('clean registry hive ignores irrelevant logs',()=>{const clean=hive.slice();put(clean,8,10);put(clean,0x1fc,checksum(clean));assert.equal(replayRegistryLogs(clean,{LOG1:l1}).length,8192);});
// Real SQLite-generated database with freed leaf pages and candidate former records.
const deleted=new Uint8Array(readFileSync(new URL('./fixtures/forensics/sqlite-freelist-real.db',import.meta.url)));
const sq=sqliteDeletedCandidates(deleted);
ok('SQLite-generated db freelist pages validated',()=>assert.ok(sq.freelistPages.length>0&&sq.freelistHeaderPages===sq.freelistPages.length));
ok('freelist results explicitly unverified, with no inferred deletion timestamp/table',()=>assert.ok(sq.candidateRows.every(x=>x.status==='unverified residual candidate'&&!('deletedAt' in x)&&!('table' in x))));
ok('SQLite freelist corrupt header count rejected',()=>{const bad=deleted.slice();new DataView(bad.buffer).setUint32(36,65535,false);assert.throws(()=>sqliteDeletedCandidates(bad),/page count/);});
ok('SQLite input signature required',()=>assert.throws(()=>sqliteDeletedCandidates(new Uint8Array(4096)),/SQLite 3/));
const evtx=new Uint8Array(readFileSync(new URL('./fixtures/forensics/evtx-binxml-two-events.evtx',import.meta.url)));
const altered=evtx.slice();altered[4096+512+24+4]=0xff;
ok('strict EVTX conversion still rejects corrupt BinXML',()=>assert.throws(()=>convertEvtx(altered,'json',50),/BinXML|template|unsupported/));
const salvage=JSON.parse(convertEvtx(altered,'json',50,true));
ok('EVTX salvage reports exactly one record damaged and a surviving record',()=>{assert.equal(salvage.partial,true);assert.equal(salvage.issues.length,1);assert.equal(salvage.events.length,1);});
const mam=new Uint8Array(readFileSync(new URL('./fixtures/forensics/prefetch-mam04-controlled.pf',import.meta.url)));
const pfPlain=new Uint8Array(readFileSync(new URL('./fixtures/forensics/prefetch-uncompressed-controlled.pf',import.meta.url)));
const plainMetadata=JSON.parse(parsePrefetch(pfPlain));
ok('controlled canonical Huffman MAM04 expands to identical Prefetch metadata',()=>{const x=JSON.parse(parsePrefetch(mam));assert.equal(x.compression,'MAM04 XPRESS-Huffman');assert.equal(x.executable,'TESTPROGRAM.EXE');assert.equal(x.runCount,3);assert.equal(x.hash,plainMetadata.hash);});
ok('MAM04 corrupted output length fails closed',()=>{const bad=mam.slice();put(bad,4,255);assert.throws(()=>parsePrefetch(bad),/decompression|XPRESS|file size/);});
const prefetchBad=new Uint8Array(84);word(prefetchBad,0,'MAM');prefetchBad[3]=4;put(prefetchBad,4,10000);
ok('malformed compressed Prefetch cannot fabricate evidence',()=>assert.throws(()=>parsePrefetch(prefetchBad),/XPRESS/));
const pe=new Uint8Array(readFileSync(new URL('./fixtures/forensics/setuptools-cli-64.exe',import.meta.url)));
const auth=await peAuthenticodeImageHash(pe);
ok('genuine Windows PE authentihash is 64-character SHA-256; trust is NOT inferred',()=>{assert.equal(auth.sha256,'30688df7fdf1be3301ea896204f38f2cbc88c4fca05961439a983ebfb9369afb');assert.equal(auth.trustVerified,false);});
const peCsum=pe.slice(),peOff=u(pe,0x3c),csum=peOff+24+64;peCsum[csum]^=0xff;
assert.equal((await peAuthenticodeImageHash(peCsum)).sha256,auth.sha256);tests++;console.log(`PASS [DEEP ${tests}] PE checksum excluded from Authenticode digest`);
const peData=pe.slice();peData[0x42]^=0xff;
assert.notEqual((await peAuthenticodeImageHash(peData)).sha256,auth.sha256);tests++;console.log(`PASS [DEEP ${tests}] PE covered-header tampering changes Authenticode digest`);
const malformed=pe.slice();malformed[0]=0;
await assert.rejects(()=>peAuthenticodeImageHash(malformed),/Expected/);tests++;console.log(`PASS [DEEP ${tests}] non-PE rejected by Authenticode image digest`);
const operators=['SQLite Freelist Record Candidates','Registry Hive Transaction Replay (ZIP)','EVTX Salvage Report','PE Authenticode Image Hash (SHA256)'];
ok('all four additional operations registered',()=>operators.forEach(n=>assert.ok(MODULES[n],n)));
const result=await bake(deleted,[{module:'SQLite Freelist Record Candidates',args:[]}]);
ok('SQLite recovery operation executes via HexSpindle recipe engine',()=>{assert.equal(result.error,null);assert.ok(JSON.parse(new TextDecoder().decode(result.output)).freelistPages.length);});

// ZIP fixture: verifies actual browser recipe can apply log replay to native hive bytes.
function crc32(b){let c=0xffffffff;for(const x of b){c^=x;for(let j=0;j<8;j++)c=c>>>1^((c&1)?0xedb88320:0);}return (c^0xffffffff)>>>0;}
function makeZip(parts){const enc=new TextEncoder(),files=[],locals=[];let cursor=0;
 for(const [name,bytes] of parts){const nm=enc.encode(name),crc=crc32(bytes),start=cursor;
  const h=new Uint8Array(30+nm.length+bytes.length),v=new DataView(h.buffer);
  v.setUint32(0,0x04034b50,true);v.setUint16(4,20,true);v.setUint32(14,crc,true);v.setUint32(18,bytes.length,true);v.setUint32(22,bytes.length,true);v.setUint16(26,nm.length,true);h.set(nm,30);h.set(bytes,30+nm.length);locals.push(h);cursor+=h.length;
  const d=new Uint8Array(46+nm.length),w=new DataView(d.buffer);w.setUint32(0,0x02014b50,true);w.setUint16(4,20,true);w.setUint16(6,20,true);w.setUint32(16,crc,true);w.setUint32(20,bytes.length,true);w.setUint32(24,bytes.length,true);w.setUint16(28,nm.length,true);w.setUint32(42,start,true);d.set(nm,46);files.push(d);
 }
 const cdStart=cursor,cdSize=files.reduce((a,b)=>a+b.length,0),end=new Uint8Array(22),e=new DataView(end.buffer);e.setUint32(0,0x06054b50,true);e.setUint16(8,parts.length,true);e.setUint16(10,parts.length,true);e.setUint32(12,cdSize,true);e.setUint32(16,cdStart,true);
 const out=new Uint8Array(cdStart+cdSize+end.length);let off=0;for(const f of [...locals,...files,end]){out.set(f,off);off+=f.length;}return out;
}
const zippedHive=makeZip([['NTUSER.DAT',hive],['NTUSER.DAT.LOG1',l1]]);
const zipResult=await bake(zippedHive,[{module:'Registry Hive Transaction Replay (ZIP)',args:[]},{module:'Windows Registry Hive Inspector',args:[]}]);
ok('ZIP matched hive and HvLE stream replay through real HexSpindle recipe',()=>{assert.equal(zipResult.error,null);const j=JSON.parse(new TextDecoder().decode(zipResult.output));assert.equal(j[0].name,'AFTER');});
const badZip=zippedHive.slice();badZip[60]^=1;const badReplay=await bake(badZip,[{module:'Registry Hive Transaction Replay (ZIP)',args:[]}]);
ok('registry ZIP CRC mismatch surfaces as recipe error',()=>assert.ok(badReplay.error));
const salvageResult=await bake(altered,[{module:'EVTX Salvage Report',args:[50]}]);
ok('EVTX salvage report available through actual recipe engine',()=>{assert.equal(salvageResult.error,null);const j=JSON.parse(new TextDecoder().decode(salvageResult.output));assert.equal(j.partial,true);assert.equal(j.events.length,1);});
const authResult=await bake(pe,[{module:'PE Authenticode Image Hash (SHA256)',args:[]}]);
ok('PE Authenticode image hash operation works through recipe engine',()=>{assert.equal(authResult.error,null);assert.equal(JSON.parse(new TextDecoder().decode(authResult.output)).sha256,auth.sha256);});

console.log(`PASS: ${tests} deep forensics checks`);
