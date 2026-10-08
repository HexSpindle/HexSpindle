import assert from 'node:assert/strict';
import { applyFileRecordFixup, parseMftRecord, parseMft } from '../modules/forensics/_windows.js';
function fixture({size=1024, badSecond=false, badUsa=false}={}) {
  const d=new Uint8Array(size), v=new DataView(d.buffer);
  d.set([70,73,76,69],0); // FILE
  v.setUint16(4,badUsa?1022:0x30,true);
  v.setUint16(6,3,true);
  v.setUint16(16,3,true); v.setUint16(20,0x38,true);v.setUint16(22,1,true);
  v.setUint32(24,size,true);v.setUint32(28,size,true);
  v.setUint16(0x30,0xabcd,true);v.setUint16(0x32,0x1111,true);v.setUint16(0x34,0x2222,true);
  v.setUint16(510,0xabcd,true);v.setUint16(1022,badSecond?0xeeee:0xabcd,true);
  v.setUint32(0x38,0xffffffff,true);
  return d;
}
let checks=0;
function check(label,fn){fn();checks++;console.log('PASS:',label)}
check('valid USA restored both sector tails',()=>{let out=applyFileRecordFixup(fixture());let v=new DataView(out.buffer);assert.equal(v.getUint16(510,true),0x1111);assert.equal(v.getUint16(1022,true),0x2222)});
check('source bytes immutable',()=>{let input=fixture();applyFileRecordFixup(input);assert.equal(new DataView(input.buffer).getUint16(510,true),0xabcd)});
check('torn record rejected rather than silently parsed',()=>assert.throws(()=>parseMftRecord(fixture({badSecond:true})),/mismatch at sector 2/));
check('invalid update-sequence header rejected',()=>assert.throws(()=>parseMftRecord(fixture({badUsa:true})),/Invalid NTFS/));
check('invalid FILE signature rejected',()=>{let b=fixture();b[0]=0;assert.throws(()=>applyFileRecordFixup(b),/Not an NTFS/)});
check('valid record parses record flags',()=>{let r=parseMftRecord(fixture());assert.equal(r.inUse,true);assert.equal(r.sequence,3)});
check('MFT stream uses fixed slots, not embedded FILE byte-pattern hunting',()=>{let f=fixture(), b=new Uint8Array(2048);b.set(f,0);b.set([70,73,76,69],1200);let o=JSON.parse(parseMft(b));assert.equal(o.records.length,1);assert.equal(o.nonFileSlots,1);assert.equal(o.totalSlots,2)});
check('MFT reports failed records without concealing corruption',()=>{let o=JSON.parse(parseMft(fixture({badSecond:true})));assert.equal(o.corruptRecords,1);assert.match(o.warning,/corrupt/)});
check('truncated trailing bytes reported',()=>{let d=new Uint8Array(1027);d.set(fixture());let o=JSON.parse(parseMft(d));assert.equal(o.trailingBytes,3);assert.ok(o.warning)});
check('record sizes validated',()=>assert.throws(()=>parseMft(fixture(),1000),/512-byte multiple/));
console.log(`PASS: ${checks} NTFS MFT USA/frame conformance assertions`);
