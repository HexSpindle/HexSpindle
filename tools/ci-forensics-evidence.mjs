// SPDX-License-Identifier: MIT
// Format-specific, deterministic DFIR fixtures. Unlike the 5-family sweep,
// these assertions verify semantic fields from structurally valid specimens.
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {FORENSICS_EVIDENCE_GUIDE} from '../core/forensics-evidence-guide.js';
import {MODULES} from '../core/registry.js';
import {bake} from '../core/engine.js';
import {parseEvtx,parseRegistryHive,parsePrefetch,parseLnk,parseUsn} from '../modules/forensics/_windows.js';
import {peImportHash,peSections,peAuthenticode,peResources,pePackerHeuristics} from '../modules/forensics/_binary.js';
import {parseChromeHistory,parseFirefoxHistory,parseChromiumDownloads,parseCookieMetadata,parseWindowsTimeline} from '../modules/forensics/_browser.js';
import {normalizeSysmon,analyzeWindowsLogons,analyzeKerberos,analyzeRdp,detectServiceInstalls,reassemblePowerShell4104,analyzeDefender,evaluateSigmaSubset} from '../modules/forensics/_logs.js';
const data=p=>new Uint8Array(readFileSync(new URL('./fixtures/forensics/'+p,import.meta.url)));
const parsed=(fn,d,...args)=>JSON.parse(fn(d,...args));
let checks=0;function check(label,fn){fn();checks++;console.log(`PASS [${checks}] ${label}`)};
const evtx=data('evtx-header-records-synthetic.evtx');
const hive=data('registry-value-synthetic.hiv');
const sqlite=data('browser-sqlite-synthetic.db');
const ev=parsed(parseEvtx,evtx);
check('EVTX real eight-byte ElfFile+NUL header accepted',()=>assert.equal(ev.headerSize,128));
check('EVTX 16-bit count and physical 64-KiB chunk accepted',()=>assert.equal(ev.validChunks,1));
check('EVTX actual framed event record metadata (two IDs)',()=>assert.deepEqual(ev.records.map(x=>x.recordId),['41','42']));
check('EVTX UTC FILETIME metadata and record-frame sizes',()=>{assert.equal(ev.records[0].size,32);assert.match(ev.records[0].writtenUtc,/^20\d{2}/)});
check('EVTX corrupt signature rejected',()=>{let b=evtx.slice();b[7]=1;assert.throws(()=>parseEvtx(b),/ElfFile/)});
check('EVTX truncated header rejected',()=>assert.throws(()=>parseEvtx(evtx.subarray(0,34)),/Truncated/));
const reg=parsed(parseRegistryHive,hive);
check('native regf registry key parsed',()=>assert.equal(reg[0].name,'ROOT'));
check('native registry DWORD value recovered',()=>{assert.equal(reg[0].values[0].value,42);assert.equal(reg[0].values[0].name,'Foo')});
check('invalid hive rejected',()=>assert.throws(()=>parseRegistryHive(new Uint8Array(100)),/registry hive/i));
check('Chrome raw SQLite URL and title joined from two tables',()=>{const x=parsed(parseChromeHistory,sqlite);assert.equal(x[0].url,'https://example.org/demo');assert.equal(x[0].title,'Example page')});
check('Firefox raw SQLite history time semantics',()=>{const x=parsed(parseFirefoxHistory,sqlite);assert.equal(x[0].url,'https://mozilla.org/');assert.equal(x[0].visitTime,'2023-11-14T22:13:20.000Z')});
check('Chromium raw SQLite download URL-chain join',()=>{const x=parsed(parseChromiumDownloads,sqlite);assert.equal(x[0].urlChain[0],'https://example.org/evidence.zip')});
check('Chromium cookie flags extracted without decryption',()=>{const x=parsed(parseCookieMetadata,sqlite);assert.equal(x[0].host,'example.org');assert.equal(x[0].httpOnly,true)});
check('SQLite ActivitiesCache source table and epoch time',()=>{const x=parsed(parseWindowsTimeline,sqlite);assert.equal(x.records[0].Id,'demo');assert.equal(x.records[0].StartTimeIso,'2023-11-14T22:13:20.000Z')});
check('malformed non-SQLite input refused',()=>assert.throws(()=>parseChromeHistory(new Uint8Array(128)),/SQLite/));
const pref=new Uint8Array(256), pv=new DataView(pref.buffer);pv.setUint32(0,30,true);pref.set([83,67,67,65],4);pv.setUint32(12,256,true);
for(let i=0;i<8;i++)pv.setUint16(16+i*2,'TEST.EXE'.charCodeAt(i),true);
check('Prefetch SCCA file name and size',()=>{const x=parsed(parsePrefetch,pref);assert.equal(x.executable,'TEST.EXE');assert.equal(x.fileSize,256)});
check('Prefetch unsupported MAM compression rejected with actionable error',()=>{const b=new Uint8Array(20);b.set([77,65,77,3]);assert.throws(()=>parsePrefetch(b),/Unsupported Prefetch MAM/)});
check('Prefetch invalid signature rejected',()=>assert.throws(()=>parsePrefetch(new Uint8Array(256)),/SCCA/));
const pe=new Uint8Array(1024),pdv=new DataView(pe.buffer);pe.set([77,90],0);pdv.setUint32(0x3c,0x80,true);pe.set([80,69,0,0],0x80);pdv.setUint16(0x80+4,0x8664,true);pdv.setUint16(0x80+6,1,true);pdv.setUint16(0x80+20,0xe0,true);
const opt=0x98;pdv.setUint16(opt,0x10b,true);pdv.setUint32(opt+92,16,true);const sec=opt+0xe0;pe.set(new TextEncoder().encode('.text'),sec);pdv.setUint32(sec+8,128,true);pdv.setUint32(sec+12,4096,true);pdv.setUint32(sec+16,128,true);pdv.setUint32(sec+20,512,true);pdv.setUint32(sec+36,0x60000020,true);
check('valid PE signature with NUL padding accepted (regression)',()=>assert.equal(parsed(peSections,pe).sections[0].name,'.text'));
check('PE imphash uses MD5 of canonical empty import list',()=>assert.equal(parsed(peImportHash,pe).imphash,'d41d8cd98f00b204e9800998ecf8427e'));
check('unsigned PE has no Authenticode certificate',()=>assert.equal(parsed(peAuthenticode,pe).present,false));
check('PE without resource directory has empty resources',()=>assert.deepEqual(parsed(peResources,pe),[]));
check('PE packer heuristic labels results as heuristic',()=>assert.match(parsed(pePackerHeuristics,pe).interpretation,/not proof/));
check('invalid PE signature rejected',()=>{const b=pe.slice();b[0x82]=1;assert.throws(()=>peSections(b),/PE signature/)});
const lnk=new Uint8Array(0x4c);lnk.set([0x4c,0,0,0,1,0x14,2,0,0,0,0,0,0xc0,0,0,0,0,0,0,0x46]);
check('Shell Link CLSID and 0x4c header accepted',()=>assert.equal(parsed(parseLnk,lnk).targetFileSize,0));
const usn=new Uint8Array(80),udv=new DataView(usn.buffer);udv.setUint32(0,80,true);udv.setUint16(4,2,true);udv.setUint16(56,8,true);udv.setUint16(58,60,true);for(let i=0;i<4;i++)udv.setUint16(60+i*2,'test'.charCodeAt(i),true);
check('USN_RECORD v2 decoded filename',()=>assert.equal(parsed(parseUsn,usn)[0].name,'test'));
const enc=s=>new TextEncoder().encode(s);
const xml=id=>enc(`<Event><System><Provider Name="Test"/><EventID>${id}</EventID><TimeCreated SystemTime="2026-10-08T10:00:00Z"/><Computer>HOST</Computer></System><EventData><Data Name="TargetUserName">analyst</Data><Data Name="TargetDomainName">DOMAIN</Data><Data Name="LogonType">10</Data><Data Name="ScriptBlockId">abc</Data><Data Name="MessageNumber">1</Data><Data Name="MessageTotal">1</Data><Data Name="ScriptBlockText">Get-Date</Data></EventData></Event>`);
check('Windows logon analyzer consumes event XML and finds account',()=>assert.equal(parsed(analyzeWindowsLogons,xml(4624))[0].user,'DOMAIN\\analyst'));
check('Kerberos parser accepts decoded 4768 XML',()=>assert.equal(parsed(analyzeKerberos,xml(4768))[0].eventId,4768));
check('RDP parser accepts decoded type-10 logon XML',()=>assert.equal(parsed(analyzeRdp,xml(4624))[0].eventId,4624));
check('service-install parser accepts decoded 7045 XML',()=>assert.equal(parsed(detectServiceInstalls,xml(7045))[0].eventId,7045));
check('PowerShell 4104 reconstruction uses XML Data fields',()=>assert.equal(parsed(reassemblePowerShell4104,xml(4104))[0].script,'Get-Date'));
check('Defender parses decoded 1116 event',()=>assert.equal(parsed(analyzeDefender,xml(1116))[0].eventId,1116));
check('Sysmon consumes valid decoded event XML',()=>assert.equal(parsed(normalizeSysmon,xml(1))[0].eventId,1));
check('event-level parsers reject raw EVTX with explicit limitation',()=>{for(const fn of [normalizeSysmon,analyzeWindowsLogons,analyzeKerberos,analyzeRdp,detectServiceInstalls,reassemblePowerShell4104,analyzeDefender])assert.throws(()=>fn(evtx),/Raw \.evtx is a binary BinXML/)});
const sigmaBase='title: Test\ndetection:\n  selection:\n    Image|endswith: cmd.exe\n  other:\n    EventID: 1\n';
const sigmaRecords='\n---EVENTS---\n'+JSON.stringify([{Image:'C:\\Windows\\cmd.exe',EventID:1},{Image:'pwsh.exe',EventID:1}]);
check('Sigma and condition works without dynamic Function/eval (CSP-safe)',()=>assert.equal(parsed(evaluateSigmaSubset,enc(sigmaBase+'  condition: selection and other'+sigmaRecords)).matched,1));
check('Sigma not/parenthesized expressions use correct precedence',()=>assert.equal(parsed(evaluateSigmaSubset,enc(sigmaBase+'  condition: selection and (not other)'+sigmaRecords)).matched,0));
check('Sigma unsupported expression fails explicitly, not silent zero matches',()=>assert.throws(()=>evaluateSigmaSubset(enc(sigmaBase+'  condition: selection | other'+sigmaRecords)),/Unsupported Sigma/));
check('86 operation acquisition guide entries, no missing source',()=>{assert.equal(Object.keys(FORENSICS_EVIDENCE_GUIDE).length,86);for(const [k,v] of Object.entries(FORENSICS_EVIDENCE_GUIDE))assert.ok(v.input&&v.source&&v.acquire&&v.note,k)});
check('GUI guidance distinguishes raw hives from derived exports',()=>{for(const name of ['Run Key Analyzer','Windows Services Registry Analyzer','OpenSave MRU Analyzer','RecentDocs Analyzer','ShimCache Parser'])assert.match(FORENSICS_EVIDENCE_GUIDE[name].input,/Raw/)});
for (const [path, expectedName, bytes, predicate] of [
  ['../modules/forensics/windows_evtx_metadata_inspector.js','Windows EVTX Metadata Inspector',evtx, x => x.validRecordFrames === 2],
  ['../modules/forensics/windows_registry_hive_inspector.js','Windows Registry Hive Inspector',hive, x => x[0]?.values?.some(v => v.name === 'Foo' && v.value === 42)],
  ['../modules/forensics/chrome_history_parser.js','Chrome History Parser',sqlite, x => x.some(v => v.url === 'https://example.org/demo')],
]) {
  await import(path);
  assert.ok(MODULES[expectedName], 'Missing '+expectedName);
  const result=await bake(bytes,[{module:expectedName,args:[]}]);
  assert.equal(result.error,null,'Real recipe engine failed: '+expectedName);
  assert.ok(predicate(JSON.parse(new TextDecoder().decode(result.output))), 'Incorrect engine output: '+expectedName);
  checks++;
  console.log(`PASS [${checks}] Real recipe engine preserves raw artifact bytes for ${expectedName}`);
}
await import('../modules/forensics/parse_unix_file_permissions.js');
const perms=await bake(new TextEncoder().encode('0755'),[{module:'Parse UNIX file permissions',args:[]}]);
assert.equal(perms.error,null,'Unix permissions must accept text bytes through the recipe engine');
assert.match(new TextDecoder().decode(perms.output),/rwxr-xr-x/);
checks++;console.log(`PASS [${checks}] UNIX permissions text input through real recipe engine`);
console.log(`PASS: ${checks} format-specific semantic checks; synthetic binary fixtures are not a substitute for authentic Windows artifacts.`);
