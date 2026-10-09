// SPDX-License-Identifier: MIT
// Regression tests: local IOC host matching, JSON/JSONL handoff and mixed parallel.
import assert from 'node:assert/strict';
import { gzipSync } from 'node:zlib';
import { createHash } from 'node:crypto';
import { MODULES, register, StructuredResult } from '../core/registry.js';
import { bake } from '../core/engine.js';
import { normaliseRecipe } from '../core/recipe-interop-parallel.js';
import { encodeUtf8, decodeUtf8 } from '../core/util.js';
import '../modules/networking/threatfox_ioc.js';
import '../modules/networking/urlhaus_url.js';
import {
  parseIndicators, parseIndex, indicatorHost, indicatorKey, findMatches, lookupAbusech,
} from '../modules/networking/_abusech_local.js';
import { statusRows } from '../modules/networking/_feed_status_ui.js';

const city = statusRows({datasets:{maxmind_geolite2_city:{
  database_name:'GeoLite2-City.mmdb',database_updated_date:'2026-10-06',
  source_retrieved_at:'2026-10-09T06:13:00Z',mmdb_format_version:'2.0',
}}},'IP GeoLocation');
assert.equal(city[0].database_name,'GeoLite2-City.mmdb');
assert.equal(city[0].database_updated_date,'2026-10-06');
for (const op of ['ThreatFox IOC Lookup','URLhaus URL Lookup']) {
  assert(MODULES[op]);
  assert.equal(MODULES[op].parallelSafe,true);
  assert.equal(MODULES[op].parallelGroup,'ioc-enrichment');
  assert.equal(MODULES[op].args[1].type,'boolean');
  assert.equal(MODULES[op].args[1].value,true);
}
assert(!MODULES['SANS ISC Import Feed']);
assert.deepEqual(parseIndicators('["test.invalid","test.invalid"]'), ['test.invalid']);
assert.deepEqual(parseIndicators('[\n  {"indicator":"one.example","found":true},\n  {"indicator":"two.example","found":false}\n]'),['one.example','two.example']);
assert.deepEqual(parseIndicators('{"indicator":"one.example","matches":[]}\n{"indicator":"two.example","found":false}'),['one.example','two.example']);
assert.deepEqual(parseIndicators('{"ip":"192.0.2.8"}'),['192.0.2.8']);
const iocs=Array.from({length:20001},(_,i)=>`https://ioc${i}.example/a`).join('\n');
assert.equal(parseIndicators(iocs).length,20001,'synced databases must permit >5000 indicators');
assert.throws(()=>parseIndicators('X'.repeat(16_000_001)),/Input exceeds/);
assert.equal(indicatorKey('hxxp://115.63.78.29:58952/bin.sh'),'http://115.63.78.29:58952/bin.sh');
assert.equal(indicatorHost('hxxp://115.63.78.29:58952/bin.sh'),'115.63.78.29');
assert.equal(indicatorHost('134.116.205.35.bc.googleusercontent[.]com'),'134.116.205.35.bc.googleusercontent.com');
assert.equal(indicatorHost('https://example.com/path/bad.example.com'),'example.com');
assert.equal(indicatorHost('2001:0db8::1'),'2001:db8::1');
assert.equal(indicatorHost('http://[2001:db8::1]:8443/a'),'2001:db8::1');

const threat = Buffer.from([
  { indicator:'134.116.205.35.bc.googleusercontent.com',type:'domain',malware:'php.shin_webshell' },
  { indicator:'198.51.100.7:443',type:'ip:port',malware:'TestOnly' },
  { indicator:'https://abc.example.com/evil',type:'url',malware:'Example' },
].map(x=>JSON.stringify(x)).join('\n')+'\n');
const url=Buffer.from([
  { indicator:'http://115.63.78.29:58952/i',status:'online' },
  { indicator:'http://evil-example.com/a',status:'offline' },
  { indicator:'https://sub.example.com/Malware',status:'online' },
].map(x=>JSON.stringify(x)).join('\n')+'\n');
const parsedUrl = parseIndex(url.toString(),'urlhaus');
const hostMap = new Map();
for (const [key,list] of parsedUrl) {
  const host=indicatorHost(key);if(!hostMap.has(host))hostMap.set(host,[]);hostMap.get(host).push(...list);
}
const index={rows:parsedUrl,hosts:hostMap,suffix:[...hostMap].map(([h])=>[h.split('.').reverse().join('.'),h]).sort((a,b)=>a[0].localeCompare(b[0]))};
assert.equal(findMatches(index,'115.63.78.29')[0].match_type,'same_host');
assert.equal(findMatches(index,'hxxp://115.63.78.29:58952/bin.sh')[0].match_type,'same_host');
assert.equal(findMatches(index,'example.com').length,1,'parent domain finds a real subdomain');
assert.equal(findMatches(index,'example.com')[0].match_type,'subdomain_host');
assert.equal(findMatches(index,'not-example.com').length,0);

const sources={abusech_threatfox:['abusech-threatfox-iocs.jsonl.gz',threat],abusech_urlhaus:['abusech-urlhaus-urls.jsonl.gz',url]};
const manifest={schema_version:1,generated_at:'2026-10-09T05:00:00Z',datasets:{}};
for(const [kind,[filename,raw]] of Object.entries(sources)) {
 const compressed=gzipSync(raw);
 manifest.datasets[kind]={path:'data/feeds/'+filename,sha256:createHash('sha256').update(raw).digest('hex'),raw_bytes:raw.length,compressed_bytes:compressed.length,source_retrieved_at:'2026-10-09T05:00:00Z'};
 sources[kind].push(compressed);
}
const oldFetch=globalThis.fetch;
const network=[];
globalThis.fetch=async input=>{
 const url=String(input);network.push(url);
 if(url.includes('/data/feeds/manifest.json'))return new Response(JSON.stringify(manifest),{status:200});
 for(const [, [filename,,compressed]] of Object.entries(sources)){
  if(url.includes('/data/feeds/'+filename))return new Response(compressed,{status:200,headers:{'content-length':String(compressed.length)}});
 }
 throw new Error('External lookup forbidden: '+url);
};
function out(result) {return JSON.parse(result.output);}
function asRows(result){return Array.isArray(result)?result:[result];}
try {
 const tf=asRows(out(await lookupAbusech('threatfox','134.116.205.35.bc.googleusercontent[.]com\n198.51.100.7', 'JSON',true)));
 assert.equal(tf.length,2);
 assert(tf.every(x=>x.found));
 assert.equal(tf[0].matches[0].malware,'php.shin_webshell');
 assert.equal(tf[1].matches[0].match_type,'same_host','IP search finds ip:port');
 const uhl=asRows(out(await lookupAbusech('urlhaus','115.63.78.29\nhxxp://115.63.78.29:58952/bin.sh','JSON',true)));
 assert.equal(uhl.length,2);
 assert.equal(uhl[0].matches[0].indicator,'http://115.63.78.29:58952/i');
 assert.equal(uhl[1].matches[0].match_type,'same_host','different URL path must not claim exact');
 const exact=out(await lookupAbusech('urlhaus','hxxp://115.63.78.29:58952/i'));
 assert.equal(exact.matches[0].match_type,'exact_indicator');
 assert.equal(asRows(out(await lookupAbusech('urlhaus','192.0.2.14\n115.63.78.29'))).length,1,'found-only default');
 assert.equal(asRows(out(await lookupAbusech('urlhaus','192.0.2.14\n115.63.78.29','JSON',false))).length,2,'unchecked shows nonhits');
 assert.equal(asRows(out(await lookupAbusech('urlhaus','192.0.2.14','JSON',true))).length,0,'no matches => empty array');
 const batch=Array.from({length:10003},(_,i)=>i===5001?'115.63.78.29':`192.0.2.${i}x`).join('\n');
 const found=out(await lookupAbusech('urlhaus',batch,'JSON',true));
 assert.equal(found.indicator,'115.63.78.29');
 assert.equal(asRows(out(await lookupAbusech('urlhaus',batch,'JSON',false))).length,10003);
 // Sequential JSON handoff should treat a whole JSON array as the input, never '[', '{' lines.
 const sequential=await bake(encodeUtf8('134.116.205.35.bc.googleusercontent[.]com\n115.63.78.29'),[
   {module:'ThreatFox IOC Lookup',args:['JSON',false]},
   {module:'URLhaus URL Lookup',args:['JSON',false]},
 ]);
 assert.equal(sequential.error,null,JSON.stringify(sequential.error));
 assert.equal(asRows(JSON.parse(decodeUtf8(sequential.output))).length,2);
 // Existing IOC-IOC grouping.
 const recipe=[
  {module:'ThreatFox IOC Lookup',args:['JSON',false]},
  {module:'URLhaus URL Lookup',args:['JSON',false],parallel:true},
 ];
 const both=await bake(encodeUtf8('134.116.205.35.bc.googleusercontent[.]com\n115.63.78.29'),recipe);
 assert.equal(both.error,null,JSON.stringify(both.error));
 const grouped=asRows(JSON.parse(decodeUtf8(both.output)));
 assert(grouped.every(x=>x.indicator && x.enrichment.abusech_urlhaus && x.enrichment.abusech_threatfox));
 // Existing IP-only provider and IOC provider can be grouped (without spoofing IP keys).
 register('Synthetic Local IP Provider','Synthetic IP provider for tests',[],input=>new StructuredResult('test',{
  type:'ip-enrichment',provider:'local_ip',rows:[{ip:'115.63.78.29',country:'Test'}]
 }),{text:true,net:false,parallelSafe:true,parallelGroup:'ip-enrichment',parallelProvider:'local_ip'});
 const mixedSteps=[
  {module:'Synthetic Local IP Provider',args:[]},
  {module:'URLhaus URL Lookup',args:['JSON',true],parallel:true},
 ];
 assert.equal(normaliseRecipe(mixedSteps, MODULES).recipe[1].parallel,true,'mixed parallel recipe import works');
 const mixed=await bake(encodeUtf8('115.63.78.29'),mixedSteps);
 assert.equal(mixed.error,null,JSON.stringify(mixed.error));
 const combined=JSON.parse(decodeUtf8(mixed.output));
 assert.equal(combined.ip,'115.63.78.29');
 assert.equal(combined.enrichment.local_ip.data.country,'Test');
 assert.equal(combined.enrichment.abusech_urlhaus.data.found,true);
 const requests=network.length;
 await lookupAbusech('urlhaus','115.63.78.29');
 assert.equal(network.length,requests,'cached dataset, no subsequent network lookups');
 console.log('PASS: defanged/full URL/IP/domain host and subdomain matching, exact vs same-host classification');
 console.log('PASS: JSON, JSONL and sequential JSON handoff, found-only toggle, 10K+ IOC bulk lookup');
 console.log('PASS: parallel IOC+IOC and IOC+IP structured merges, same-origin gzip, cached lookup');
} finally {globalThis.fetch=oldFetch;}
