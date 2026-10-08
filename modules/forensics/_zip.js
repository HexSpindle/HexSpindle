// SPDX-License-Identifier: MIT
// Small read-only ZIP/JAR/APK reader using browser-native DecompressionStream.
import { u16le, u32le, latin1, text } from './_common.js';

export function listZip(data) {
  // Prefer the central directory; this makes data-descriptor local entries safe to locate.
  let eocd = -1;
  for (let i = Math.max(0, data.length - 0x10000 - 22); i + 22 <= data.length; i++) {
    if (u32le(data, i) === 0x06054b50) eocd = i;
  }
  if (eocd < 0) throw new Error('ZIP end-of-central-directory record not found');
  const count = u16le(data, eocd + 10), cdOff = u32le(data, eocd + 16);
  const out=[]; let p=cdOff;
  for(let n=0;n<count && p+46<=data.length;n++){
    if(u32le(data,p)!==0x02014b50) break;
    const flags=u16le(data,p+8), method=u16le(data,p+10), crc32=u32le(data,p+16), compSize=u32le(data,p+20), size=u32le(data,p+24), nameLen=u16le(data,p+28), extraLen=u16le(data,p+30), commentLen=u16le(data,p+32), localOff=u32le(data,p+42);
    const nameBytes=data.subarray(p+46,p+46+nameLen); const name=(flags&0x800)?text(nameBytes):latin1(nameBytes);
    out.push({name,flags,method,crc32,compSize,size,localOff}); p+=46+nameLen+extraLen+commentLen;
  }
  return out;
}
export async function zipEntryBytes(data, entry) {
  const p=entry.localOff; if(u32le(data,p)!==0x04034b50) throw new Error(`ZIP local header missing for ${entry.name}`);
  const nl=u16le(data,p+26), el=u16le(data,p+28), start=p+30+nl+el; const comp=data.subarray(start,start+entry.compSize);
  if(entry.method===0) return comp.slice();
  if(entry.method===8){
    const ds=new DecompressionStream('deflate-raw');
    const ab=await new Response(new Blob([comp]).stream().pipeThrough(ds)).arrayBuffer(); return new Uint8Array(ab);
  }
  throw new Error(`ZIP compression method ${entry.method} is not supported for ${entry.name}`);
}
export async function findZipEntry(data, name) { const e=listZip(data).find(x=>x.name===name); return e?zipEntryBytes(data,e):null; }
