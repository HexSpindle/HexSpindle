// SPDX-License-Identifier: MIT
import { module } from './_cat.js';
import { listZip,zipEntryBytes } from './_zip.js';
import { replayRegistryLogs } from './_reg_log.js';
function crc32(b){let c=0xffffffff;for(const x of b){c^=x;for(let i=0;i<8;i++)c=(c>>>1)^((c&1)?0xedb88320:0);}return(c^0xffffffff)>>>0;}
async function replayZIP(data){
 const entries=listZip(data).filter(e=>!e.name.endsWith('/'));
 if(new Set(entries.map(e=>e.name.toLowerCase())).size!==entries.length)throw Error('Ambiguous duplicate ZIP entries');
 const byName=new Map(entries.map(e=>[e.name.toLowerCase(),e]));
 const bases=entries.filter(e=>byName.has((e.name+'.log1').toLowerCase())||byName.has((e.name+'.log2').toLowerCase()));
 if(bases.length!==1)throw Error('ZIP must contain exactly one registry hive and its matching .LOG1/.LOG2 (identical ZIP folder and basename)');
 const base=bases[0],matches=[];
 for(const ext of ['.log1','.log2']){const e=byName.get((base.name+ext).toLowerCase());if(e)matches.push([ext,e]);}
 for(const e of [base,...matches.map(x=>x[1])])if(e.flags&1||e.size>128*1048576)throw Error('Encrypted or oversized registry ZIP member');
 const hive=await zipEntryBytes(data,base);if(hive.length!==base.size||crc32(hive)!==base.crc32)throw Error('Registry hive ZIP CRC/size mismatch');
 const logs={};for(const [name,e] of matches){const b=await zipEntryBytes(data,e);if(b.length!==e.size||crc32(b)!==e.crc32)throw Error('Registry log ZIP CRC/size mismatch');logs[name]=b;}
 return replayRegistryLogs(hive,logs);
}
module('Registry Hive Transaction Replay (ZIP)','Input: ZIP with native registry hive (e.g. NTUSER.DAT) and matching .LOG1/.LOG2. Replays only modern HvLE transactions with validated Marvin32 hashes and consecutive sequences. Returns recovered raw regf for downstream hive operations. Explicitly rejects unsupported legacy log formats and ambiguous/incomplete recovery.',[],replayZIP);
