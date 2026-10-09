// SPDX-License-Identifier: MIT
// Local fixtures; never sends IOC samples or requires API credentials.
import assert from 'node:assert/strict';
import { gzipSync } from 'node:zlib';
import { createHash } from 'node:crypto';
import { MODULES } from '../core/registry.js';
import '../modules/networking/threatfox_ioc.js';
import '../modules/networking/urlhaus_url.js';
import { parseIndicators, parseIndex, lookupAbusech } from '../modules/networking/_abusech_local.js';

assert(MODULES['ThreatFox IOC Lookup']);
assert(MODULES['URLhaus URL Lookup']);
assert(!MODULES['SANS ISC Import Feed']);
assert.deepEqual(parseIndicators('["test.invalid","test.invalid"]'), ['test.invalid']);
const fixture = '{"indicator":"198.51.100.7:443","type":"ip:port","malware":"TestOnly"}\n';
assert.equal(parseIndex(fixture).get('198.51.100.7:443')[0].malware,'TestOnly');
assert(!parseIndex(fixture).has('198.51.100.7'),'IP:port must never match bare IP');

const threat = Buffer.from(fixture);
const url = Buffer.from('{"indicator":"https://bad.example/Malware","status":"online"}\n');
const fixtures = {abusech_threatfox:['abusech-threatfox-iocs.jsonl.gz',threat],abusech_urlhaus:['abusech-urlhaus-urls.jsonl.gz',url]};
const manifest = {schema_version:1,generated_at:'2026-10-09T05:00:00Z',datasets:{}};
for (const [kind,[file,raw]] of Object.entries(fixtures)) {
  const compressed = gzipSync(raw);
  manifest.datasets[kind] = {path:'data/feeds/'+file,sha256:createHash('sha256').update(raw).digest('hex'),raw_bytes:raw.length,compressed_bytes:compressed.length,source_retrieved_at:'2026-10-09T05:00:00Z'};
  fixtures[kind].push(compressed);
}
const fetches=[];
const before=globalThis.fetch;
globalThis.fetch=async input=>{
  const link=String(input);fetches.push(link);
  if (link.includes('/data/feeds/manifest.json'))return new Response(JSON.stringify(manifest),{status:200});
  for (const [kind,[filename,_raw,gzip]] of Object.entries(fixtures)) {
    if(link.includes('/data/feeds/'+filename))return new Response(gzip,{status:200,headers:{'content-length':String(gzip.length)}});
  }
  throw new Error('Unexpected external lookup: '+link);
};
try {
  const a=JSON.parse(await lookupAbusech('threatfox','198.51.100.7:443\n198.51.100.7'));
  assert.deepEqual(a.map(x=>x.found),[true,false]);
  const b=JSON.parse(await lookupAbusech('urlhaus','https://bad.example/Malware\nhttps://bad.example/malware'));
  assert.deepEqual(b.map(x=>x.found),[true,false],'URL case-sensitive paths');
  const first=fetches.length;
  await lookupAbusech('threatfox','198.51.100.7:443');
  assert.equal(fetches.length,first,'must use local cache for repeated matches');
  assert.equal(fetches.filter(x=>x.endsWith('.gz?v='+manifest.datasets.abusech_threatfox.sha256.slice(0,16))).length,1);
  console.log('PASS abuse.ch exact IP:port and case-sensitive URL matching, gzip, SHA identity, no external per-IOC requests, cache');
} finally {globalThis.fetch=before;}
