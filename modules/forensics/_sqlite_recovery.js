// SPDX-License-Identifier: MIT
// Conservative SQLite deleted-content assessment. A freelist leaf is not proof
// of deletion, and a plausible cell is NOT evidence of a deleted SQL row.
import { SQLiteReader } from './_sqlite.js';
const be=(b,o)=>new DataView(b.buffer,b.byteOffset,b.byteLength).getUint32(o,false);
const be16=(b,o)=>(b[o]<<8)|b[o+1];
const serial=(v)=>typeof v==='bigint'?v.toString():v instanceof Uint8Array?{bytes:v.length,hex:Array.from(v.subarray(0,96),x=>x.toString(16).padStart(2,'0')).join('')}:v;
export function sqliteDeletedCandidates(data,{maxPages=20000,maxRows=5000}={}){
 const r=new SQLiteReader(data),claimed=be(data,36),trunk=be(data,32),unused=[],chain=new Set(),usedPages=new Set(),candidates=[];
 if(claimed>r.pages)throw Error('SQLite freelist page count exceeds physical database');
 let p=trunk,seenCount=0;
 while(p){
  if(chain.has(p))throw Error('SQLite freelist trunk cycle');chain.add(p);
  if(chain.size>maxPages)throw Error('SQLite freelist exceeds inspection bound');
  const page=r.page(p),next=be(page,0),count=be(page,4);
  if(count>Math.floor((r.usable-8)/4))throw Error('SQLite freelist trunk leaf count exceeds page');
  if(usedPages.has(p))throw Error('SQLite freelist duplicate page');usedPages.add(p);unused.push({page:p,role:'trunk'});seenCount++;
  for(let i=0;i<count;i++){
   const n=be(page,8+i*4);if(n===p||n<1||n>r.pages)throw Error('SQLite freelist leaf index out of range');
   if(usedPages.has(n))throw Error('SQLite duplicate freelist page');usedPages.add(n);
   unused.push({page:n,role:'leaf'});seenCount++;
  }
  if(unused.length>maxPages)throw Error('SQLite freelist exceeds inspection bound');p=next;
 }
 if(seenCount!==claimed)throw Error(`SQLite freelist page count disagreement (${seenCount} vs header ${claimed})`);
 const anomalies=[];
 for(const {page,role} of unused){
  if(role!=='leaf')continue;
  const pg=r.page(page);
  if(pg[0]!==0x0d)continue; // only intact table b-tree leaf pages are unambiguous candidates
  const cellCount=be16(pg,3),start=be16(pg,5)||65536;
  if(cellCount>Math.floor((r.usable-8)/2)||start>r.usable){anomalies.push({page,reason:'invalid former table leaf header'});continue;}
  for(let i=0;i<cellCount;i++){
    if(candidates.length>=maxRows)throw Error('SQLite candidate reporting cap reached; refusing incomplete output');
    const off=be16(pg,8+i*2);
    if(off<8+cellCount*2||off>=r.usable){anomalies.push({page,cellIndex:i,reason:'invalid cell pointer'});continue;}
    try{const {rowid,payload}=r.cellPayload(pg,off),values=r.decodeRecord(payload);
      candidates.push({freelistPage:page,cellOffset:off,rowid:String(rowid),values:values.map(serial),status:'unverified residual candidate',attribution:'unknown table; historic/free page not proof of deletion'});
    }catch(e){anomalies.push({page,cellIndex:i,reason:String(e.message)});}
  }
 }
 return {pageSize:r.pageSize,freelistHeaderPages:claimed,freelistPages:unused,freeblockRecovery:'not performed: SQLite overwrites four bytes at each freeblock head; blind reconstruction is unsafe',candidateRows:candidates,anomalies,confidence:'structural freelist membership confirmed; candidate records only, table and deletion time unknown',note:'Freelist content is not proof of deletion. SQLite secure_delete and page reuse may erase remnants. Compare candidates to independent snapshots, WAL, and active rows before attribution.'};
}
