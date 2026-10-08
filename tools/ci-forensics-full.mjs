// SPDX-License-Identifier: MIT
// Broad, dependency-free execution coverage for every registered Forensics operation.
import assert from 'node:assert/strict';
import { readdirSync } from 'node:fs';
import { MODULES } from '../core/registry.js';
const filenames=readdirSync(new URL('../modules/forensics/',import.meta.url)).filter(f=>f.endsWith('.js')&&!f.startsWith('_'));
for(const file of filenames) await import(`../modules/forensics/${file}`);
const ops=Object.values(MODULES).filter(m=>m.category==='forensics');
assert.equal(ops.length,filenames.length, 'Every file must register exactly one operation');
const samples=[['empty',new Uint8Array()],['printable',new TextEncoder().encode('2026-10-08T10:00:00Z EventID=4625 failed password from 192.0.2.1\nInvoke-Expression foo\n')],['json',new TextEncoder().encode(JSON.stringify({EventID:4624,TimeCreated:'2026-10-08T10:00:00Z',Records:[{EventID:4625,Computer:'host',IpAddress:'192.0.2.1'}],RecordsCount:1,RecordsProcessed:1,events:[{id:1}],permissions:['debugger'],name:'test'}))],['xml',new TextEncoder().encode('<Task><Actions><Exec><Command>cmd.exe</Command></Exec></Actions></Task>')],['binary',new Uint8Array(512)]];
const stats={operations:ops.length,executions:0,successes:0,rejected:0,unexpected:[],outputTypes:{}};
for(const m of ops){
 for(const [sample,input] of samples){stats.executions++;try{
  const args=(m.args||[]).map(a=>a.value);
  const out=await m.func(input,...args);
  if(out===undefined||out===null) throw new Error('Operation returned empty undefined/null value');
  if(typeof out==='number') throw new Error('Unexpected numeric result');
  stats.outputTypes[typeof out]=(stats.outputTypes[typeof out]||0)+1;
  if(typeof out==='string'&&/^[\[{]/.test(out.trim())) {try{JSON.parse(out)}catch(e){stats.unexpected.push(`${m.name} ${sample}: malformed JSON: ${e.message}`)}}
  stats.successes++;
 }catch(error){
  if(error.message.includes('Operation returned empty')||error.message.includes('Unexpected numeric'))stats.unexpected.push(`${m.name} ${sample}: ${error.message}`);
  else stats.rejected++;
 }}
}
console.log(JSON.stringify(stats,null,2));
assert.equal(stats.unexpected.length,0,stats.unexpected.join('\n'));
console.log('PASS: all forensics operations invoked with five generic input families; valid-format reference coverage remains in ci-forensics.mjs.');
