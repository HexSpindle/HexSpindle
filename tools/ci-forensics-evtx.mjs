#!/usr/bin/env node
// SPDX-License-Identifier: MIT
// HexSpindle EVTX conversion reference fixture: independent EVTX construction,
// shared template reuse, native-to-JSON/XML chaining, malicious/truncated input.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { MODULES } from '../core/registry.js';
import '../modules/forensics/from_evtx_to_xml.js';
import '../modules/forensics/from_evtx_to_json.js';
import '../modules/forensics/windows_logon_analyzer.js';
import { convertEvtx } from '../modules/forensics/_evtx_binxml.js';
const data=new Uint8Array(readFileSync(new URL('./fixtures/forensics/evtx-binxml-two-events.evtx',import.meta.url)));
let passed=0;
function test(name,fn){try{fn();passed++;console.log('PASS: '+name);}catch(e){console.error('FAIL: '+name);throw e;}}
const outputJson=MODULES['EVTX to JSON'].func(data,100);
const outputXml=MODULES['EVTX to XML'].func(data,100);
const records=JSON.parse(outputJson);
test('EVTX JSON record IDs and count',()=>assert.deepEqual(records.map(x=>x.RecordId),['1','2']));
test('EVTX JSON event IDs',()=>assert.deepEqual(records.map(x=>x.EventID),[4624,4625]));
test('EVTX JSON provider and account names',()=>{assert.equal(records[0].ProviderName,'Microsoft-Windows-Security-Auditing');assert.deepEqual(records.map(x=>x.EventData.Data[0].value),['alice','bob']);});
test('EVTX XML provides a well-formed document wrapper',()=>{assert.match(outputXml,/^<\?xml /);assert.match(outputXml,/<Events>/);assert.match(outputXml,/<\/Events>$/);});
test('EVTX XML emits two complete events',()=>assert.equal((outputXml.match(/<Event>/g)||[]).length,2));
test('EVTX XML contains EventData fields',()=>assert.match(outputXml,/<Data Name="TargetUserName">alice<\/Data>/));
test('Native EVTX → JSON → Windows Logon Analyzer',()=>{const r=JSON.parse(MODULES['Windows Logon Analyzer'].func(new TextEncoder().encode(outputJson)));assert.deepEqual(r.map(x=>x.eventId),[4624,4625]);assert.deepEqual(r.map(x=>x.result),['success','failure']);});
test('Native EVTX → XML → Windows Logon Analyzer',()=>{const r=JSON.parse(MODULES['Windows Logon Analyzer'].func(new TextEncoder().encode(outputXml)));assert.deepEqual(r.map(x=>x.eventId),[4624,4625]);});
test('Maximum event count honored',()=>assert.equal(JSON.parse(convertEvtx(data,'json',1)).length,1));
test('Reject invalid EVTX signature',()=>{const altered=data.slice();altered[0]=0;assert.throws(()=>convertEvtx(altered),/ElfFile/);});
test('Reject truncated header',()=>assert.throws(()=>convertEvtx(data.slice(0,80)),/truncated/i));
test('Reject corrupted binary XML without false clean output',()=>{const altered=data.slice();const off=4096+512+24+4;altered[off]=0xff;assert.throws(()=>convertEvtx(altered),/BinXML|unsupported|template/i);});
console.log(`PASS: ${passed} EVTX conversion / chain assertions`);
