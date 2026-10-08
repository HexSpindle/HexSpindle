// SPDX-License-Identifier: MIT
// Windows Registry transaction replay (modern HvLE log format, Windows 8.1+).
// Recovery is limited to validated consecutive log entries. Never alters source evidence.
const S = new TextDecoder('ascii');
const SIGN=(b,o,n)=>S.decode(b.subarray(o,o+n));
const u32=(b,o)=>new DataView(b.buffer,b.byteOffset,b.byteLength).getUint32(o,true);
const u64=(b,o)=>new DataView(b.buffer,b.byteOffset,b.byteLength).getBigUint64(o,true);
const put=(b,o,v)=>new DataView(b.buffer,b.byteOffset,b.byteLength).setUint32(o,v,true);
const rol=(x,n)=>((x<<n)|(x>>>(32-n)))>>>0;
const SEED_A=0x884def82, SEED_B=0xc5554e7a;
export function marvin32(bytes,p0=SEED_A,p1=SEED_B){
  function block(){p1^=p0;p0=rol(p0,20);p0=(p0+p1)>>>0;p1=rol(p1,9);p1^=p0;p0=rol(p0,27);p0=(p0+p1)>>>0;p1=rol(p1,19);}
  let i=0;for(;i+4<=bytes.length;i+=4){p0=(p0+u32(bytes,i))>>>0;block();}
  let tail=0x80<<(8*(bytes.length-i));for(let j=i;j<bytes.length;j++)tail|=bytes[j]<<(8*(j-i));
  p0=(p0+tail)>>>0;block();block();return(BigInt(p1>>>0)<<32n)|BigInt(p0>>>0);
}
function hiveChecksum(b){let sum=0;for(let p=0;p<0x1fc;p+=4)sum^=u32(b,p);return sum>>>0;}
function validBase(b){return b.length>=4096&&SIGN(b,0,4)==='regf'&&u32(b,0x1fc)===hiveChecksum(b);}
const MAX=128*1048576;
function parseLog(log, name){
  if(log.length<512||SIGN(log,0,4)!=='regf')throw Error(`${name} missing regf header`);
  if(u32(log,0x1c)!==6)throw Error(`${name} uses unsupported legacy transaction format (only modern HvLE type 6 supported)`);
  if(log.length<512||u32(log,0x1fc)!==hiveChecksum(log))throw Error(`${name} invalid transaction-log base-block checksum`);
  const entries=[];
  for(let p=512;p+40<=log.length;){
    if(SIGN(log,p,4)!=='HvLE'){if(log.subarray(p).some(x=>x!==0))throw Error(`${name}: unexpected nonzero bytes at log offset ${p}`);break;}
    const len=u32(log,p+4),seq=u32(log,p+12),bins=u32(log,p+16),count=u32(log,p+20);
    if(len<40||len%512||len>MAX||p+len>log.length)throw Error(`${name}: invalid HvLE entry length`);
    if(bins<4096||bins%4096||bins>MAX||count>100000||40+count*8>len)throw Error(`${name}: invalid HvLE bins/pages`);
    const entry=log.subarray(p,p+len), refs=[];let expected=40+count*8;
    for(let j=0;j<count;j++){
      const o=u32(entry,40+j*8),size=u32(entry,44+j*8);
      if(!size||size%512||o%512||o+size>bins||expected+size>len)throw Error(`${name}: invalid dirty page reference ${j}`);
      if(refs.some(r=>o<r.offset+r.size && r.offset<o+size))throw Error(`${name}: overlapping dirty pages`);
      refs.push({offset:o,size,dataOffset:expected});expected+=size;
    }
    // Entire entry length includes sector alignment; Marvin hashes its trailing padding too.
    if(u64(entry,24)!==marvin32(entry.subarray(40)))throw Error(`${name}: HvLE data Marvin32 mismatch for sequence ${seq}`);
    if(u64(entry,32)!==marvin32(entry.subarray(0,32)))throw Error(`${name}: HvLE header Marvin32 mismatch for sequence ${seq}`);
    entries.push({seq,bins,refs,bytes:entry,flags:u32(entry,8),source:name});p+=len;
    if(entries.length>100000)throw Error('Registry transaction log entry count exceeds limit');
  }
  return entries;
}
function verifyBins(hive,bins){
  let off=0;while(off<bins){if(off+32>bins||SIGN(hive,4096+off,4)!=='hbin')throw Error(`Registry recovery produced invalid hbin at 0x${off.toString(16)}`);
    const index=u32(hive,4096+off+4),size=u32(hive,4096+off+8);
    if(index!==off||size<4096||size%4096||off+size>bins)throw Error(`Registry hbin offset/size invalid at ${off}`);off+=size;
  }
}
export function replayRegistryLogs(hive,logs,{details=false}={}){
  if(!(hive instanceof Uint8Array)||hive.length<8192||hive.length>MAX||SIGN(hive,0,4)!=='regf')throw Error('Expected raw registry hive (at least 8 KiB)');
  if(!validBase(hive))throw Error('Registry hive base-block checksum is invalid; automatic recovery of damaged base blocks is unsupported');
  const primary=u32(hive,4),secondary=u32(hive,8),dirty=primary!==secondary;
  const size=u32(hive,0x28);
  if(!size||size%4096||size>MAX||4096+size>hive.length)throw Error('Registry hive bins are truncated or have invalid length');
  if(!dirty){const copy=hive.slice();return details?{bytes:copy,applied:0,dirty:false,lastSequence:primary}:copy;}
  const input=Object.entries(logs||{}).filter(([,v])=>v?.length);
  if(!input.length)throw Error('Dirty registry hive needs its corresponding .LOG1/.LOG2 files');
  const list=[];for(const [name,b] of input){
    if(u32(b,0x14)!==u32(hive,0x14)||u32(b,0x18)!==u32(hive,0x18)||u32(b,0x24)!==u32(hive,0x24))throw Error(`${name}: log base header version/root key does not match hive`);
    list.push(...parseLog(b,name));
  }
  // For a valid dirty base block, apply only an uninterrupted sequence starting at primary.
  const indexed=new Map();for(const e of list){if(e.seq<primary)continue;const prior=indexed.get(e.seq);
    if(prior){let eq=prior.bytes.length===e.bytes.length;for(let i=0;eq&&i<prior.bytes.length;i++)if(prior.bytes[i]!==e.bytes[i])eq=false;if(!eq)throw Error(`Conflicting registry logs at sequence ${e.seq}`);}
    else indexed.set(e.seq,e);
  }
  if(!indexed.has(primary))throw Error(`Missing first required registry transaction sequence ${primary}`);
  const maxSeq=Math.max(...indexed.keys());let seq=primary,last=null,out=hive.slice(),applied=0;
  while(indexed.has(seq)){
    const e=indexed.get(seq);if(e.bins+4096>MAX)throw Error('Recovered registry exceeds 128 MiB bound');
    if(out.length<e.bins+4096){const grown=new Uint8Array(e.bins+4096);grown.set(out);out=grown;}
    for(const ref of e.refs)out.set(e.bytes.subarray(ref.dataOffset,ref.dataOffset+ref.size),4096+ref.offset);
    last=e;applied++;seq++;
  }
  if(seq<=maxSeq)throw Error(`Registry logs have a sequence gap at ${seq}; refusing to output partial recovered hive`);
  const finalBins=last.bins;verifyBins(out,finalBins);
  put(out,4,last.seq);put(out,8,last.seq);put(out,0x28,finalBins);
  put(out,0x90,(u32(out,0x90)&~1)|(last.flags&1));
  put(out,0x1fc,hiveChecksum(out));
  const result=out.subarray(0,4096+finalBins).slice();
  return details?{bytes:result,applied,dirty:true,lastSequence:last.seq}:result;
}
