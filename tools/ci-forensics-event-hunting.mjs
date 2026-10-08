#!/usr/bin/env node
// SPDX-License-Identifier: MIT
// Focused native EVTX preallocation, chained event-analysis, and managed/native PE regression.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { MODULES } from '../core/registry.js';
import { bake } from '../core/engine.js';
import { convertEvtx } from '../modules/forensics/_evtx_binxml.js';
import { dotnetMetadata, dotnetUserStrings, peClrInspector } from '../modules/forensics/_binary.js';
import { FORENSICS_EVIDENCE_GUIDE } from '../core/forensics-evidence-guide.js';
for (const name of ['windows_event_log_summary','windows_event_log_filter','windows_event_log_integrity_analyzer','windows_account_group_changes','windows_scheduled_task_event_analyzer','windows_process_execution_events','sysmon_persistence_event_analyzer','windows_smb_share_event_analyzer','pe_clr_managed_detector']) await import('../modules/forensics/'+name+'.js');
for (const op of ['from_evtx_to_json','from_evtx_to_xml']) await import('../modules/forensics/'+op+'.js');
let passed=0;function test(label,fn){fn();passed++;console.log('PASS '+label);}
const fixture=new Uint8Array(readFileSync(new URL('./fixtures/forensics/evtx-binxml-two-events.evtx',import.meta.url)));
const padded=new Uint8Array(fixture.length+3*65536); // three preallocated zero-filled chunk slots
const declared=new DataView(padded.buffer);padded.set(fixture);declared.setUint16(42,1,true);
const parsed=JSON.parse(convertEvtx(padded,'json',100));
test('preallocated empty EVTX chunks ignored',()=>assert.deepEqual(parsed.map(x=>x.EventID),[4624,4625]));
test('EVTX XML converter ignores only empty unused capacity',()=>assert.equal((convertEvtx(padded,'xml',100).match(/<Event>/g)||[]).length,2));
test('nonzero invalid EVTX chunk still fails',()=>{let b=padded.slice();b[fixture.length+32]=3;assert.throws(()=>convertEvtx(b),/invalid chunk signature/);});
test('zero chunk inside declared populated range fails',()=>{let b=padded.slice();new DataView(b.buffer).setUint16(42,2,true);assert.throws(()=>convertEvtx(b),/missing declared chunk/);});
const enc=s=>new TextEncoder().encode(s);
const sec='Microsoft-Windows-Security-Auditing',sysmon='Microsoft-Windows-Sysmon',task='Microsoft-Windows-TaskScheduler';
function e(id,provider,fields={}){return {EventID:id,ProviderName:provider,TimeCreated:'2025-02-15T08:01:02Z',Computer:'HOST-1',EventData:{Data:Object.entries(fields).map(([Name,value])=>({Name,value:String(value)}))},System:{EventID:id,Provider:{Name:provider},TimeCreated:{SystemTime:'2025-02-15T08:01:02Z'}}};}
const samples=[
 e(1102,sec,{SubjectUserName:'investigator'}),e(4719,sec,{SubjectUserName:'operator'}),e(4720,sec,{TargetUserName:'newuser',SubjectUserName:'administrator'}),e(4732,sec,{TargetUserName:'Administrators',MemberSid:'S-1-5-21-1'}),
 e(4698,sec,{TaskName:'\\SuspiciousTask',TaskContent:'<Task><Actions>test</Actions></Task>'}),e(106,task,{TaskName:'\\MoreTasks'}),
 e(4688,sec,{NewProcessName:'C:\\Windows\\System32\\cmd.exe',CommandLine:'cmd.exe /c whoami'}),e(1,sysmon,{Image:'C:\\Temp\\my.exe',ProcessGuid:'{123}'}),e(13,sysmon,{TargetObject:'HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\Run\\x'}),
 e(5140,sec,{ShareName:'\\\\*\\ADMIN$',IpAddress:'192.0.2.10'}),e(4000,'Microsoft-Windows-SMBServer',{ShareName:'IPC$',ClientAddress:'1700ecf30000'}),
 e(1102,'Unrelated-Provider',{SubjectUserName:'noise'}),e(13,'Unrelated-Provider',{TargetObject:'not a Sysmon registry event'}),
];
const input=enc(JSON.stringify(samples));
const run=(name,...args)=>JSON.parse(MODULES[name].func(input,...args));
test('all nine new operation names register',()=>assert.equal(['Windows Event Log Summary','Windows Event Log Filter','Windows Event Log Integrity Analyzer','Windows Account & Group Changes','Windows Scheduled Task Event Analyzer','Windows Process Execution Events','Sysmon Persistence Event Analyzer','Windows SMB Share Event Analyzer','PE CLR Managed Detector'].filter(x=>MODULES[x]).length,9));
test('provider-qualified log clearing and audit policy',()=>assert.deepEqual(run('Windows Event Log Integrity Analyzer').map(x=>x.eventId),[1102,4719]));
test('Windows account and group changes',()=>assert.deepEqual(run('Windows Account & Group Changes').map(x=>x.eventId),[4720,4732]));
test('Scheduled Task event channel provider qualifiers',()=>assert.deepEqual(run('Windows Scheduled Task Event Analyzer').map(x=>x.eventId),[4698,106]));
test('Security 4688 + Sysmon process creation, not unrelated ID 1',()=>assert.deepEqual(run('Windows Process Execution Events').map(x=>x.eventId),[4688,1]));
test('Sysmon registry persistence without false positive',()=>assert.deepEqual(run('Sysmon Persistence Event Analyzer').map(x=>x.eventId),[13]));
test('SMB share Security and SMBServer provider events',()=>assert.deepEqual(run('Windows SMB Share Event Analyzer').map(x=>x.eventId),[5140,4000]));
test('SMBServer binary address remains opaque',()=>assert.equal(run('Windows SMB Share Event Analyzer')[1].rawClientAddress,'1700ecf30000'));
test('summary counts all 13 input events',()=>assert.equal(run('Windows Event Log Summary').total,13));
test('filter limits and qualifies provider',()=>assert.deepEqual(run('Windows Event Log Filter','1102, 13','Microsoft-Windows-Security',20).map(x=>x.EventID),[1102]));
test('invalid filter EventIDs fail explicitly',()=>assert.throws(()=>run('Windows Event Log Filter','1102;1a'),/decimal numbers/));
const chain=await bake(padded,[{module:'EVTX to JSON',args:[10]},{module:'Windows Event Log Summary',args:[]}]);
assert.equal(chain.error,null,chain.error?.message||String(chain.error));
test('EVTX -> JSON -> Log Summary through recipe engine',()=>assert.equal(JSON.parse(new TextDecoder().decode(chain.output)).total,2));
function peFixture(managed){const b=new Uint8Array(2048),d=new DataView(b.buffer);b.set([0x4d,0x5a]);d.setUint32(0x3c,0x80,true);b.set([0x50,0x45,0,0],0x80);d.setUint16(0x80+4,0x14c,true);d.setUint16(0x80+6,1,true);d.setUint16(0x80+20,224,true);const opt=0x98,sec=opt+224;d.setUint16(opt,0x10b,true);d.setUint32(opt+92,16,true);b.set(new TextEncoder().encode('.text'),sec);d.setUint32(sec+8,1024,true);d.setUint32(sec+12,0x2000,true);d.setUint32(sec+16,1024,true);d.setUint32(sec+20,0x200,true);if(!managed)return b;
 d.setUint32(opt+96+14*8,0x2000,true);d.setUint32(opt+96+14*8+4,72,true);d.setUint32(0x200+8,0x2080,true);d.setUint32(0x200+12,0x100,true);
 const mo=0x280;d.setUint32(mo,0x424a5342,true);d.setUint32(mo+12,12,true);b.set(new TextEncoder().encode('v4.0.30319\0\0'),mo+16);d.setUint16(mo+30,2,true);let h=mo+32;
 d.setUint32(h,0x80,true);d.setUint32(h+4,0x20,true);b.set(new TextEncoder().encode('#Strings\0'),h+8);h+=20;
 d.setUint32(h,0xb0,true);d.setUint32(h+4,0x20,true);b.set(new TextEncoder().encode('#US\0'),h+8);
 b.set(new TextEncoder().encode('\0MyAssembly\0'),mo+0x80);b.set([0,5,72,0,105,0,0],mo+0xb0);
 return b; }
const native=peFixture(false),managed=peFixture(true);
test('native PE has no CLR directory (expected)',()=>assert.equal(JSON.parse(peClrInspector(native)).managed,false));
test('native PE metadata reports explicit not-applicable instead of crashing',()=>assert.equal(JSON.parse(dotnetMetadata(native)).applicable,false));
test('native PE user string operation reports explicit not-applicable',()=>assert.equal(JSON.parse(dotnetUserStrings(native)).applicable,false));
test('managed PE CLR directory detected',()=>assert.equal(JSON.parse(peClrInspector(managed)).managed,true));
test('managed PE metadata streams parsed',()=>assert.ok(JSON.parse(dotnetMetadata(managed)).streams.some(x=>x.name==='#Strings')));
test('managed PE #US UTF16 string extracted',()=>assert.equal(JSON.parse(dotnetUserStrings(managed))[0].value,'Hi'));
test('95 evidence guidance entries complete',()=>{assert.equal(Object.keys(FORENSICS_EVIDENCE_GUIDE).length,95);for(const [k,v]of Object.entries(FORENSICS_EVIDENCE_GUIDE))assert.ok(v.input&&v.source&&v.acquire&&v.note,k);});
console.log(`PASS ${passed} native EVTX / Windows event / CLR reference checks`);
