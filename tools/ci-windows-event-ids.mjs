// SPDX-License-Identifier: MIT
// Deterministic Windows Security / Sysmon event-ID reference regression suite.
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import {resolve,dirname} from 'node:path';
import {explainWindowsEventId} from '../modules/forensics/_event_id_explainer.js';
import {SECURITY_EVENTS,SYSMON_EVENTS} from '../modules/forensics/_event_id_catalog.js';

const here=dirname(fileURLToPath(import.meta.url));
const B=s=>new TextEncoder().encode(s);
const run=s=>JSON.parse(explainWindowsEventId(B(s)));
const fixtures=JSON.parse(readFileSync(resolve(here,'event-id-explainer-ids.json'),'utf8'));
let assertions=0;
function check(fn){fn();assertions++;}

check(()=>assert.equal(Object.keys(SECURITY_EVENTS).length,421));
check(()=>assert.equal(Object.keys(SYSMON_EVENTS).length,26));
check(()=>assert.equal(fixtures.ids.length,425));
check(()=>assert.equal(fixtures.microsoft_2016_ids.length,388));
const all=run(fixtures.ids.join(', '));
check(()=>assert.equal(all.length,425));
check(()=>assert.equal(all.filter(x=>x.resolution==='unknown').length,0));
check(()=>assert.equal(all.filter(x=>x.resolution==='documented').length,421));
check(()=>assert.equal(all.filter(x=>x.resolution==='provider-unconfirmed').length,3));
check(()=>assert.equal(all.filter(x=>x.resolution==='reference-only').length,1));
for(const id of fixtures.microsoft_2016_ids){check(()=>assert.equal(all.find(x=>x.eventId===id)?.resolution,'documented',`Microsoft audited ID ${id}`));}
for(const id of fixtures.supplemental_security_ids){check(()=>assert.equal(all.find(x=>x.eventId===id)?.resolution,'documented',`Supplemental Security ID ${id}`));}
const known=run(JSON.stringify(fixtures.ids.map(eventId=>({eventId,provider:'Unknown',meaning:'No built-in explanation'}))));
check(()=>assert.equal(known.length,425));
check(()=>assert.equal(known.filter(x=>x.resolution==='unknown').length,0));
check(()=>assert.equal(run('4624, 4625, 4688').length,3));
check(()=>assert.match(run('4624')[0].meaning,/log/i));
check(()=>assert.match(run('4698')[0].meaning,/task/i));
check(()=>assert.match(run('4719')[0].meaning,/audit/i));
check(()=>assert.match(run('5379')[0].meaning,/Credential Manager/i));
check(()=>assert.match(run('Sysmon 2')[0].meaning,/creation timestamp/i));
check(()=>assert.equal(run('1')[0].resolution,'provider-unconfirmed'));
check(()=>assert.equal(run('Security 1')[0].resolution,'unknown'));
check(()=>assert.equal(run('Microsoft-Windows-Defender 4624')[0].resolution,'unknown'));
check(()=>assert.equal(run('Event ID 4624\nEvent ID 4625').length,2));
check(()=>assert.equal(run('4624(S): A logon occurred')[0].eventId,4624));
check(()=>assert.equal(run(JSON.stringify({eventId:4624,IpPort:5145,ProcessId:65232})).length,1));
check(()=>assert.equal(run(JSON.stringify({Events:[{System:{EventID:4688,Provider:{Name:'Microsoft-Windows-Security-Auditing'}}}]}))[0].eventId,4688));
const xml='<Events><Event><System><Provider Name="Microsoft-Windows-Sysmon"/><EventID>1</EventID></System><EventData><Data Name="ProcessId">4624</Data></EventData></Event></Events>';
check(()=>assert.equal(run(xml)[0].eventId,1));
check(()=>assert.equal(run(xml)[0].category,'Sysmon'));
check(()=>assert.equal(run('1102\n1102')[0].occurrences,2));
check(()=>assert.equal(run('8191')[0].resolution,'reference-only'));
check(()=>assert.throws(()=>run('garbage text with port 4624 and timestamp 2026'),/No event IDs found/));
check(()=>assert.throws(()=>run('ElfFile\0xxx'),/EVTX to JSON/));
console.log(`PASS: Windows Event ID Explainer catalog: 388 Microsoft 2016 + 33 supplements + 26 Sysmon references`);
console.log(`PASS: ${fixtures.ids.length} user-supplied ID cases classified; 0 unsupported from provided list`);
console.log(`PASS: ${assertions} assertions incl. XML/JSON ingestion, provider guards, numeric false-positive tests`);
