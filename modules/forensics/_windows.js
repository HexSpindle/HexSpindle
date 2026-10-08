// SPDX-License-Identifier: MIT
// HexSpindle original Windows artefact parsers. No third-party runtime dependency.
import {
  text, latin1, utf16, hex, safeJson, has, need, u16le, u32le, i32le, u64le, filetimeToIso,
  fixedAscii, fixedUtf16, utf16z, asciiz, printableAsciiStrings, printableUtf16Strings, parseJsonish,
} from './_common.js';

function rot13(s) { return s.replace(/[A-Za-z]/g, c => String.fromCharCode((c <= 'Z' ? 65 : 97) + (c.charCodeAt(0) - (c <= 'Z' ? 65 : 97) + 13) % 26)); }

export function parsePrefetch(data) {
  if (data.length >= 4 && latin1(data.subarray(0, 3)) === 'MAM') {
    throw new Error('Compressed MAM Prefetch detected. Decompress it first with HexSpindle XPRESS Huffman Decompress, then run this parser.');
  }
  need(data, 0, 84, 'Prefetch header');
  const version = u32le(data, 0), sig = fixedAscii(data, 4, 4);
  if (sig !== 'SCCA') throw new Error('Not an uncompressed Windows Prefetch file (missing SCCA signature)');
  const executable = fixedUtf16(data, 16, 30).replace(/\0/g, '');
  const fileSize = u32le(data, 12); const hash = u32le(data, 76);
  const info = { version, executable, fileSize, hash: '0x' + hash.toString(16).padStart(8, '0'), lastRuns: [], runCount: null, referencedFiles: [] };
  const timestampOffsets = version === 17 ? [0x78] : version === 23 ? [0x80] : (version >= 26 ? Array.from({length:8}, (_,i)=>0x80+i*8) : []);
  for (const off of timestampOffsets) if (has(data, off, 8)) { const iso = filetimeToIso(u64le(data, off)); if (iso) info.lastRuns.push(iso); }
  const rcOff = version === 17 ? 0x90 : version === 23 ? 0x98 : version >= 26 ? 0xd0 : -1;
  if (rcOff >= 0 && has(data, rcOff, 4)) info.runCount = u32le(data, rcOff);
  if (has(data, 84, 36)) {
    const filenamesOff = u32le(data, 100), filenamesSize = u32le(data, 104);
    if (filenamesOff && filenamesSize && has(data, filenamesOff, filenamesSize)) {
      info.referencedFiles = utf16(data.subarray(filenamesOff, filenamesOff + filenamesSize)).split('\0').map(x=>x.trim()).filter(Boolean).slice(0, 5000);
    }
  }
  return safeJson(info);
}

function evtxHeader(data) {
  if (fixedAscii(data, 0, 8) !== 'ElfFile\0') throw new Error('Not an EVTX file (missing ElfFile signature)');
  return { oldestChunk: Number(u64le(data, 8)), currentChunk: Number(u64le(data, 16)), nextRecordId: u64le(data, 24).toString(), headerSize: u32le(data, 32), minor: u16le(data, 36), major: u16le(data, 38), chunkCount: u16le(data, 42), flags: u32le(data, 120) };
}
export function parseEvtx(data) {
  const h = evtxHeader(data); const chunks = [];
  for (let off = 0x1000; off + 0x200 <= data.length; off += 0x10000) {
    if (fixedAscii(data, off, 8) !== 'ElfChnk\0') continue;
    const firstRecord = u64le(data, off + 8).toString(), lastRecord = u64le(data, off + 16).toString();
    const firstId = u64le(data, off + 24).toString(), lastId = u64le(data, off + 32).toString();
    const freeSpace = u32le(data, off + 48); chunks.push({ offset: off, firstRecord, lastRecord, firstId, lastId, freeSpace });
  }
  // Full BinXML template expansion is intentionally not guessed. Surface recoverable literal strings as forensic context.
  const strings = printableUtf16Strings(data, 4).filter(x => /[A-Za-z]/.test(x.text)).slice(0, 2000);
  return safeJson({ ...h, chunks, note: 'EVTX container/chunk metadata parsed. Literal UTF-16 strings are surfaced; BinXML template expansion is not performed by this dependency-free parser.', strings });
}

export function applyFileRecordFixup(record) {
  const out = record.slice();
  if (fixedAscii(out, 0, 4) !== 'FILE') return out;
  const usaOff = u16le(out, 4), usaCount = u16le(out, 6); if (!usaOff || usaCount < 2 || !has(out, usaOff, usaCount * 2)) return out;
  const sectorSize = Math.floor(out.length / (usaCount - 1)); if (!sectorSize) return out;
  const seq0 = u16le(out, usaOff);
  for (let i = 1; i < usaCount; i++) {
    const tail = i * sectorSize - 2; if (!has(out, tail, 2)) break;
    if (u16le(out, tail) !== seq0) throw new Error('MFT FILE record update-sequence-array check failed');
    out[tail] = out[usaOff + i * 2]; out[tail + 1] = out[usaOff + i * 2 + 1];
  }
  return out;
}
function fileRef(v) { const n = typeof v === 'bigint' ? v : BigInt(v); return { record: Number(n & 0x0000ffffffffffffn), sequence: Number((n >> 48n) & 0xffffn) }; }
function parseRunlist(data, off, end) {
  const runs = []; let pos = off, lcn = 0n, vcn = 0n;
  while (pos < end) {
    const h = data[pos++]; if (!h) break; const lenN = h & 0x0f, offN = h >> 4;
    if (!lenN || pos + lenN + offN > end) break;
    let len = 0n; for (let i=0;i<lenN;i++) len |= BigInt(data[pos+i]) << BigInt(i*8); pos += lenN;
    let delta = 0n;
    if (offN) {
      for (let i=0;i<offN;i++) delta |= BigInt(data[pos+i]) << BigInt(i*8);
      if (data[pos + offN - 1] & 0x80) delta -= 1n << BigInt(offN*8);
      pos += offN; lcn += delta;
    }
    runs.push({ vcn: vcn.toString(), clusters: len.toString(), lcn: offN ? lcn.toString() : null, sparse: !offN }); vcn += len;
  }
  return runs;
}
export function parseMftRecord(raw, recordIndex = null) {
  const data = applyFileRecordFixup(raw); if (fixedAscii(data, 0, 4) !== 'FILE') throw new Error('Not an NTFS FILE record');
  const seq = u16le(data, 16), links = u16le(data, 18), firstAttr = u16le(data, 20), flags = u16le(data, 22), used = u32le(data, 24), alloc = u32le(data, 28);
  const base = fileRef(u64le(data, 32)); const recordNumber = has(data,44,4) ? u32le(data,44) : recordIndex;
  const attrs = []; let off = firstAttr, guard=0;
  while (off + 16 <= data.length && guard++ < 1024) {
    const type = u32le(data, off); if (type === 0xffffffff) break;
    const len = u32le(data, off + 4); if (len < 16 || off + len > data.length) break;
    const nonresident = data[off+8] !== 0, nameLen = data[off+9], nameOff = u16le(data, off+10), id = u16le(data, off+14);
    const name = nameLen && has(data, off+nameOff, nameLen*2) ? utf16(data.subarray(off+nameOff, off+nameOff+nameLen*2)) : '';
    const a = { type:'0x'+type.toString(16).padStart(8,'0'), typeName: ATTR_TYPES[type] || 'Unknown', id, name, nonresident, length:len };
    if (!nonresident) {
      const clen=u32le(data,off+16), coff=u16le(data,off+20); a.contentLength=clen;
      if (has(data,off+coff,clen)) {
        const c=data.subarray(off+coff,off+coff+clen);
        if (type===0x10 && c.length>=32) a.standardInformation={ created:filetimeToIso(u64le(c,0)), modified:filetimeToIso(u64le(c,8)), mftModified:filetimeToIso(u64le(c,16)), accessed:filetimeToIso(u64le(c,24)), fileAttributes:c.length>=36?'0x'+u32le(c,32).toString(16):null };
        else if (type===0x30 && c.length>=66) { const nl=c[64], ns=c[65]; a.fileName={ parent:fileRef(u64le(c,0)), created:filetimeToIso(u64le(c,8)), modified:filetimeToIso(u64le(c,16)), mftModified:filetimeToIso(u64le(c,24)), accessed:filetimeToIso(u64le(c,32)), allocatedSize:u64le(c,40).toString(), realSize:u64le(c,48).toString(), flags:'0x'+u32le(c,56).toString(16), namespace:ns, name:has(c,66,nl*2)?utf16(c.subarray(66,66+nl*2)):'' }; }
        else if (type===0x80) a.residentDataBytes=c.length;
      }
    } else {
      const runOff=u16le(data,off+32); a.startVcn=u64le(data,off+16).toString(); a.lastVcn=u64le(data,off+24).toString();
      a.allocatedSize=u64le(data,off+40).toString(); a.realSize=u64le(data,off+48).toString(); a.initializedSize=u64le(data,off+56).toString();
      if (runOff < len) a.runs=parseRunlist(data,off+runOff,off+len);
    }
    attrs.push(a); off += len;
  }
  const names = attrs.filter(a=>a.fileName).map(a=>a.fileName.name);
  return { recordNumber, sequence:seq, hardLinks:links, inUse:!!(flags&1), directory:!!(flags&2), usedSize:used, allocatedSize:alloc, baseRecord:base, names, attributes:attrs };
}
const ATTR_TYPES={0x10:'$STANDARD_INFORMATION',0x20:'$ATTRIBUTE_LIST',0x30:'$FILE_NAME',0x40:'$OBJECT_ID',0x50:'$SECURITY_DESCRIPTOR',0x60:'$VOLUME_NAME',0x70:'$VOLUME_INFORMATION',0x80:'$DATA',0x90:'$INDEX_ROOT',0xa0:'$INDEX_ALLOCATION',0xb0:'$BITMAP',0xc0:'$REPARSE_POINT',0xd0:'$EA_INFORMATION',0xe0:'$EA',0x100:'$LOGGED_UTILITY_STREAM'};
export function parseMft(data, recordSize = 1024, limit = 10000) {
  const rows=[]; let off=0, idx=0;
  while (off+48<=data.length && rows.length<limit) {
    if (fixedAscii(data,off,4)==='FILE') {
      const size = Math.min(recordSize, data.length-off); try { rows.push(parseMftRecord(data.subarray(off,off+size),idx)); } catch(e){ rows.push({recordNumber:idx,offset:off,error:String(e.message||e)}); }
      off += recordSize; idx++; continue;
    }
    const next = latin1(data).indexOf('FILE',off+1); if(next<0) break; off=next;
  }
  return safeJson({recordSize,records:rows});
}
export function parseNtfsAttributes(data) { return safeJson(parseMftRecord(data)); }
export function analyzeNtfsAds(data) { const r=parseMftRecord(data); return safeJson(r.attributes.filter(a=>a.typeName==='$DATA').map(a=>({name:a.name||'(default stream)',nonresident:a.nonresident,size:a.realSize??a.contentLength??null,runs:a.runs||[]}))); }

export function parseUsn(data, limit=20000) {
  const out=[]; let off=0;
  while(off+60<=data.length && out.length<limit){ const len=u32le(data,off); if(len<60 || off+len>data.length){ off+=8; continue; } const major=u16le(data,off+4); try {
    if(major===2){ const nameLen=u16le(data,off+56), nameOff=u16le(data,off+58); out.push({offset:off,major,recordLength:len,fileReference:fileRef(u64le(data,off+8)),parentReference:fileRef(u64le(data,off+16)),usn:u64le(data,off+24).toString(),timestamp:filetimeToIso(u64le(data,off+32)),reason:decodeUsnReason(u32le(data,off+40)),sourceInfo:'0x'+u32le(data,off+44).toString(16),securityId:u32le(data,off+48),fileAttributes:'0x'+u32le(data,off+52).toString(16),name:has(data,off+nameOff,nameLen)?utf16(data.subarray(off+nameOff,off+nameOff+nameLen)):''}); }
    else if(major===3 && len>=76){ const nameLen=u16le(data,off+72), nameOff=u16le(data,off+74); out.push({offset:off,major,recordLength:len,fileReference128:hex(data.subarray(off+8,off+24)),parentReference128:hex(data.subarray(off+24,off+40)),usn:u64le(data,off+40).toString(),timestamp:filetimeToIso(u64le(data,off+48)),reason:decodeUsnReason(u32le(data,off+56)),sourceInfo:'0x'+u32le(data,off+60).toString(16),securityId:u32le(data,off+64),fileAttributes:'0x'+u32le(data,off+68).toString(16),name:has(data,off+nameOff,nameLen)?utf16(data.subarray(off+nameOff,off+nameOff+nameLen)):''}); }
  }catch(e){out.push({offset:off,error:String(e.message||e)});} off += (len+7)&~7; }
  return safeJson(out);
}
function decodeUsnReason(v){const m=[[0x1,'DATA_OVERWRITE'],[0x2,'DATA_EXTEND'],[0x4,'DATA_TRUNCATION'],[0x10,'NAMED_DATA_OVERWRITE'],[0x20,'NAMED_DATA_EXTEND'],[0x40,'NAMED_DATA_TRUNCATION'],[0x100,'FILE_CREATE'],[0x200,'FILE_DELETE'],[0x400,'EA_CHANGE'],[0x800,'SECURITY_CHANGE'],[0x1000,'RENAME_OLD_NAME'],[0x2000,'RENAME_NEW_NAME'],[0x4000,'INDEXABLE_CHANGE'],[0x8000,'BASIC_INFO_CHANGE'],[0x10000,'HARD_LINK_CHANGE'],[0x20000,'COMPRESSION_CHANGE'],[0x40000,'ENCRYPTION_CHANGE'],[0x80000,'OBJECT_ID_CHANGE'],[0x100000,'REPARSE_POINT_CHANGE'],[0x200000,'STREAM_CHANGE'],[0x80000000,'CLOSE']];return m.filter(([b])=>v&b).map(([,n])=>n);}

class RegistryHive {
  constructor(data){ if(fixedAscii(data,0,4)!=='regf') throw new Error('Not a Windows Registry hive'); this.data=data; this.root=u32le(data,0x24); this.rows=[]; this.maxCells=200000; }
  abs(rel){ return 0x1000 + rel; }
  cell(rel){ const a=this.abs(rel); if(!has(this.data,a,6)) throw new Error('Registry cell offset out of range'); const sz=i32le(this.data,a); const len=Math.abs(sz); if(len<4 || !has(this.data,a,len)) throw new Error('Invalid registry cell size'); return this.data.subarray(a+4,a+len); }
  nk(rel){ const c=this.cell(rel); if(fixedAscii(c,0,2)!=='nk') throw new Error('Registry key cell is not NK'); const flags=u16le(c,2), nameLen=u16le(c,0x48); const nameBytes=c.subarray(0x4c,0x4c+nameLen); const name=(flags&0x20)?latin1(nameBytes):utf16(nameBytes); return { rel,c,flags,name,lastWrite:filetimeToIso(u64le(c,4)),parent:u32le(c,0x10),subCount:u32le(c,0x14),subList:u32le(c,0x1c),valueCount:u32le(c,0x24),valueList:u32le(c,0x28) }; }
  subkeys(rel){ if(rel===0xffffffff) return []; const c=this.cell(rel), sig=fixedAscii(c,0,2); const count=u16le(c,2), out=[]; if(sig==='lf'||sig==='lh'){ for(let i=0;i<count;i++) out.push(u32le(c,4+i*8)); } else if(sig==='li'){for(let i=0;i<count;i++) out.push(u32le(c,4+i*4));} else if(sig==='ri'){for(let i=0;i<count;i++) out.push(...this.subkeys(u32le(c,4+i*4)));} return out; }
  value(rel){ const c=this.cell(rel); if(fixedAscii(c,0,2)!=='vk') throw new Error('Registry value cell is not VK'); const nameLen=u16le(c,2), dataLenRaw=u32le(c,4), dataOff=u32le(c,8), type=u32le(c,12), flags=u16le(c,16); const name=nameLen?((flags&1)?latin1(c.subarray(20,20+nameLen)):utf16(c.subarray(20,20+nameLen))):'(Default)'; let bytes; const inline=!!(dataLenRaw&0x80000000), dataLen=dataLenRaw&0x7fffffff; if(inline){ bytes=new Uint8Array(4); new DataView(bytes.buffer).setUint32(0,dataOff,true); bytes=bytes.subarray(0,Math.min(dataLen,4)); } else { try{bytes=this.cell(dataOff).subarray(0,dataLen);}catch{bytes=new Uint8Array();} } return {name,type,typeName:REG_TYPES[type]||`REG_${type}`,bytes,value:decodeReg(type,bytes)}; }
  values(nk){ if(!nk.valueCount || nk.valueList===0xffffffff) return []; let l; try{l=this.cell(nk.valueList);}catch{return [];} const out=[]; for(let i=0;i<nk.valueCount && i*4+4<=l.length;i++){ try{out.push(this.value(u32le(l,i*4)));}catch{} } return out; }
  walk(limit=50000){const out=[], seen=new Set(), stack=[[this.root,'']]; while(stack.length&&out.length<limit){const [rel,parent]=stack.pop(); if(seen.has(rel)) continue; seen.add(rel); let k; try{k=this.nk(rel);}catch{continue;} const path=parent?parent+'\\'+k.name:k.name; const vals=this.values(k).map(v=>({name:v.name,type:v.typeName,value:v.value,bytes:v.bytes.length,hex:v.bytes.length<=64?hex(v.bytes):undefined,_raw:v.bytes})); out.push({path,name:k.name,lastWrite:k.lastWrite,values:vals}); const subs=this.subkeys(k.subList); for(let i=subs.length-1;i>=0;i--) stack.push([subs[i],path]);} return out; }
}
const REG_TYPES={0:'REG_NONE',1:'REG_SZ',2:'REG_EXPAND_SZ',3:'REG_BINARY',4:'REG_DWORD',5:'REG_DWORD_BIG_ENDIAN',6:'REG_LINK',7:'REG_MULTI_SZ',8:'REG_RESOURCE_LIST',9:'REG_FULL_RESOURCE_DESCRIPTOR',10:'REG_RESOURCE_REQUIREMENTS_LIST',11:'REG_QWORD'};
function decodeReg(type,b){try{if(type===1||type===2||type===6)return utf16(b).replace(/\0+$/g,'');if(type===7)return utf16(b).split('\0').filter(Boolean);if(type===4&&b.length>=4)return u32le(b,0);if(type===5&&b.length>=4)return new DataView(b.buffer,b.byteOffset,b.byteLength).getUint32(0,false);if(type===11&&b.length>=8)return u64le(b,0).toString();return b.length<=256?hex(b):`<${b.length} binary bytes>`;}catch{return `<${b.length} binary bytes>`;}}
export function parseRegistryHive(data, limit=5000){ const hive=new RegistryHive(data); const rows=hive.walk(limit).map(k=>({...k,values:k.values.map(v=>{const {_raw,...x}=v;return x;})})); return safeJson(rows); }
function hiveRows(data,limit=50000){return new RegistryHive(data).walk(limit);}

export function parseAmcache(data){const rows=hiveRows(data);const hit=rows.filter(k=>/\\(?:InventoryApplicationFile|InventoryApplication|File|Programs)(?:\\|$)/i.test(k.path)).map(k=>({path:k.path,lastWrite:k.lastWrite,values:Object.fromEntries(k.values.map(v=>[v.name,v.value]))}));return safeJson(hit);}
export function parseShimCache(data){const rows=hiveRows(data);const vals=[];for(const k of rows)for(const v of k.values)if(/^AppCompatCache$/i.test(v.name)){const raw=v._raw;const strings=[...printableUtf16Strings(raw,4),...printableAsciiStrings(raw,6)].filter(x=>/[\\/]|\.exe\b/i.test(x.text));vals.push({key:k.path,lastWrite:k.lastWrite,bytes:raw.length,strings:strings.slice(0,500),note:'ShimCache binary layout varies by Windows version; this operation safely extracts container metadata and path-like strings without fabricating execution timestamps.'});}return safeJson(vals);}
export function decodeUserAssist(data){let rows=[];try{rows=hiveRows(data).filter(k=>/\\UserAssist\\.*\\Count$/i.test(k.path));}catch{} if(rows.length){const out=[];for(const k of rows)for(const v of k.values){const name=rot13(v.name);const b=v._raw;let runCount=null,lastRun=null,focusTimeMs=null;if(b.length>=72){runCount=u32le(b,4);focusTimeMs=u32le(b,12);lastRun=filetimeToIso(u64le(b,60));}else if(b.length>=16){runCount=u32le(b,4);lastRun=filetimeToIso(u64le(b,8));}out.push({key:k.path,encodedName:v.name,name,runCount,focusTimeMs,lastRun,bytes:b.length});}return safeJson(out);}const j=parseJsonish(data);if(j){const arr=Array.isArray(j)?j:[j];return safeJson(arr.map(x=>({...x,name:rot13(x.name??x.valueName??'')})));}return rot13(text(data));}
export function parseBamDam(data){const rows=hiveRows(data).filter(k=>/\\Services\\(?:bam|dam)\\State\\UserSettings\\/i.test(k.path));const out=[];for(const k of rows)for(const v of k.values){const b=v._raw;out.push({key:k.path,userSid:k.path.split('\\').pop(),path:v.name,lastExecution:b.length>=8?filetimeToIso(u64le(b,0)):null,bytes:b.length});}return safeJson(out);}
export function parseShellBags(data){const rows=hiveRows(data).filter(k=>/\\BagMRU(?:\\|$)/i.test(k.path));const out=[];for(const k of rows){for(const v of k.values){if(v.name==='MRUListEx')continue;const b=v._raw;const candidates=[...printableUtf16Strings(b,2),...printableAsciiStrings(b,3)].map(x=>x.text).filter(x=>/[A-Za-z0-9]/.test(x));out.push({key:k.path,valueName:v.name,lastWrite:k.lastWrite,itemStrings:[...new Set(candidates)].slice(0,20),bytes:b.length});}}return safeJson(out);}

export function parseLnkBytes(data){need(data,0,0x4c,'Shell Link header');if(u32le(data,0)!==0x4c)throw new Error('Not a Windows Shell Link (.lnk): header size is not 0x4c');const clsid=hex(data.subarray(4,20));if(clsid!=='0114020000000000c000000000000046')throw new Error('Not a Windows Shell Link: CLSID mismatch');const flags=u32le(data,20),attrs=u32le(data,24);const out={linkFlags:'0x'+flags.toString(16),fileAttributes:'0x'+attrs.toString(16),creationTime:filetimeToIso(u64le(data,28)),accessTime:filetimeToIso(u64le(data,36)),writeTime:filetimeToIso(u64le(data,44)),targetFileSize:u32le(data,52),iconIndex:i32le(data,56),showCommand:u32le(data,60),hotKey:'0x'+u16le(data,64).toString(16),localBasePath:null,commonPathSuffix:null,relativePath:null,workingDirectory:null,arguments:null,iconLocation:null};let p=0x4c;if(flags&1){need(data,p,2);const n=u16le(data,p);p+=2+n;}if(flags&2){need(data,p,4);const liSize=u32le(data,p);if(liSize>=0x1c&&has(data,p,liSize)){const hs=u32le(data,p+4),baseOff=u32le(data,p+16),suffixOff=u32le(data,p+24);if(hs>=0x24){const baseU=u32le(data,p+28),sufU=u32le(data,p+32);if(baseU&&baseU<liSize)out.localBasePath=utf16z(data,p+baseU);if(sufU&&sufU<liSize)out.commonPathSuffix=utf16z(data,p+sufU);}if(!out.localBasePath&&baseOff&&baseOff<liSize)out.localBasePath=asciiz(data,p+baseOff);if(!out.commonPathSuffix&&suffixOff&&suffixOff<liSize)out.commonPathSuffix=asciiz(data,p+suffixOff);p+=liSize;}}
  const unicode=!!(flags&0x80);function readString(){if(!has(data,p,2))return '';const n=u16le(data,p);p+=2;const bytes=n*(unicode?2:1);if(!has(data,p,bytes)){p=data.length;return '';}const s=unicode?utf16(data.subarray(p,p+bytes)):latin1(data.subarray(p,p+bytes));p+=bytes;return s;}
  if(flags&4)out.name=readString();if(flags&8)out.relativePath=readString();if(flags&0x10)out.workingDirectory=readString();if(flags&0x20)out.arguments=readString();if(flags&0x40)out.iconLocation=readString();return out;}
export function parseLnk(data){return safeJson(parseLnkBytes(data));}
export function parseJumpList(data){const sig=new Uint8Array([0x4c,0x00,0x00,0x00,0x01,0x14,0x02,0x00,0x00,0x00,0x00,0x00,0xc0,0x00,0x00,0x00,0x00,0x00,0x00,0x46]);const hits=[];outer:for(let i=0;i+sig.length<=data.length;i++){for(let j=0;j<sig.length;j++)if(data[i+j]!==sig[j])continue outer;let end=Math.min(data.length,i+65536);let parsed=null;try{parsed=parseLnkBytes(data.subarray(i,end));}catch{}hits.push({offset:i,lnk:parsed});i+=sig.length-1;}return safeJson({embeddedShellLinks:hits,note:'Automatic/custom Jump List compound-file streams are scanned for embedded Shell Link records. DestList metadata is not guessed when a full CFB directory mapping is unavailable.'});}
export function parseRecycleBin(data){need(data,0,24,'$I recycle-bin metadata');const ver=Number(u64le(data,0)),size=u64le(data,8).toString(),deleted=filetimeToIso(u64le(data,16));let path='';if(ver===2&&has(data,24,4)){const chars=u32le(data,24);path=has(data,28,chars*2)?utf16(data.subarray(28,28+chars*2)).replace(/\0+$/,''):utf16z(data,28);}else path=utf16z(data,24);return safeJson({version:ver,originalSize:size,deletionTime:deleted,originalPath:path});}

export function parseZoneIdentifier(data){const s=text(data);const out={};for(const line of s.split(/\r?\n/)){const i=line.indexOf('=');if(i>0)out[line.slice(0,i).trim()]=line.slice(i+1).trim();}const zones={0:'Local Machine',1:'Local Intranet',2:'Trusted Sites',3:'Internet',4:'Restricted Sites'};if(out.ZoneId!==undefined)out.ZoneName=zones[Number(out.ZoneId)]||'Unknown';return safeJson(out);}

export function parseOpenSaveMru(data){try{const rows=hiveRows(data).filter(k=>/\\ComDlg32\\OpenSavePidlMRU(?:\\|$)/i.test(k.path));const out=[];for(const k of rows)for(const v of k.values){if(v.name==='MRUListEx')continue;out.push({key:k.path,valueName:v.name,lastWrite:k.lastWrite,strings:[...printableUtf16Strings(v._raw,2),...printableAsciiStrings(v._raw,3)].map(x=>x.text)});}return safeJson(out);}catch{return safeJson(parseJsonish(data)||[]);}}
export function parseRecentDocs(data){const rows=hiveRows(data).filter(k=>/\\RecentDocs(?:\\|$)/i.test(k.path));const out=[];for(const k of rows)for(const v of k.values){if(v.name==='MRUListEx')continue;out.push({key:k.path,valueName:v.name,lastWrite:k.lastWrite,strings:printableUtf16Strings(v._raw,2).map(x=>x.text)});}return safeJson(out);}
export function analyzeRunKeys(data){const rows=hiveRows(data).filter(k=>/\\(?:Run|RunOnce)$/i.test(k.path));return safeJson(rows.flatMap(k=>k.values.map(v=>({key:k.path,lastWrite:k.lastWrite,name:v.name,command:v.value}))));}
export function analyzeServicesRegistry(data){const rows=hiveRows(data).filter(k=>/\\ControlSet\d+\\Services\\[^\\]+$/i.test(k.path));return safeJson(rows.map(k=>({key:k.path,service:k.name,lastWrite:k.lastWrite,values:Object.fromEntries(k.values.map(v=>[v.name,v.value]))})));}
export function correlateStartup(data){const j=parseJsonish(data);const rows=Array.isArray(j)?j:(j?[j]:[]);const out=rows.map(x=>({source:x.source||x.artifact||x.type||'unknown',name:x.name||x.valueName||x.service||'',command:x.command||x.path||x.imagePath||x.target||'',user:x.user||x.sid||'',timestamp:x.timestamp||x.lastWrite||x.lastRun||'',risk:/powershell|cmd\.exe|wscript|cscript|mshta|rundll32|regsvr32|\\temp\\|appdata/i.test(String(x.command||x.path||''))?'review':'normal'}));return safeJson(out);}
