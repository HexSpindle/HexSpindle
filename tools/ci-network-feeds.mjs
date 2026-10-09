// SPDX-License-Identifier: MIT
// Network operation regression tests run in main HexSpindle CI before deployment.
import assert from 'node:assert/strict';
import { gzipSync } from 'node:zlib';
import { createHash } from 'node:crypto';
import { lookupGeoJS } from '../modules/networking/geojs_ip.js';
import { lookupIPInfo } from '../modules/networking/ipinfo_io.js';
import { MODULES } from '../core/registry.js';
import '../modules/networking/arin_rdap.js';
import { lookupSansBulk } from '../modules/networking/sans_isc_ip.js';
import '../modules/networking/ripestat_ip.js';

const originalFetch = globalThis.fetch;
let geoCalls = 0, ptrCalls = 0, legacyCalls = 0;
const ips = Array.from({length:45},(_,i)=>`198.51.100.${i+1}`);
const urls = [];
globalThis.fetch = async (input) => {
  const url = String(input); urls.push(url);
  if (url.includes('/v1/ip/geo.json?ip=')) {
    geoCalls++;
    const values = new URL(url).searchParams.get('ip').split(',');
    return new Response(JSON.stringify(values.map(ip=>({ip,country:'Testland',asn:64500,longitude:'1.5',latitude:'2.5'}))),{status:200,headers:{'content-type':'application/json'}});
  }
  if (url.includes('/v1/dns/ptr/')) {ptrCalls++;return new Response(JSON.stringify({ptr:'test.invalid'}),{status:200});}
  if (url.includes('/data/feeds/manifest.json')) return new Response('Not yet published',{status:404});
  if (url.includes('ipinfo.io/')) {legacyCalls++;return new Response(JSON.stringify({ip:'8.8.8.8',city:'Example',country:'US',org:'AS15169 Google LLC'}),{status:200});}
  throw new Error('Unexpected network URL '+url);
};
try {
  const geo = await lookupGeoJS(ips.join('\n'),false,'JSON');
  const result = JSON.parse(geo.output);
  assert.equal(result.length,45);
  assert.equal(geoCalls,3,'45 IPs must use three 20-IP batches');
  assert.equal(ptrCalls,0,'PTR disabled by default');
  assert.deepEqual(result.map(x=>x.ip),ips,'preserve input order');
  assert(result.every(x=>x.country==='Testland'&&x.asn===64500));
  assert.equal(urls.filter(x=>x.includes('geo.json')).length,3);
  await assert.rejects(lookupGeoJS(ips.join('\n'),true,'JSON'), /PTR.*20/);
  assert.equal(geoCalls,3,'PTR safety check precedes all lookups');
  const info = JSON.parse((await lookupIPInfo('8.8.8.8','JSON','Auto (prefer local Lite if published)')).output);
  assert.equal(info.city,'Example'); assert.equal(legacyCalls,1,'Lite missing must safely fall back');
  await assert.rejects(lookupIPInfo(ips.join('\n'),'JSON','Anonymous legacy API (limited)'),/25 IPs/);
  assert.equal(legacyCalls,1,'Anonymous safety cap must precede remote calls');
  assert.equal(MODULES['ARIN RDAP'].connection,null);
  assert.equal(MODULES['SANS ISC IP'].connection,null);
  assert.equal(MODULES['SANS ISC Import Feed'], undefined, 'Removed offline importer must not register');
  for (const name of ['IPInfo.io Basic','GeoJS IP Lookup','RIPEstat IP Intelligence']) {
    assert(MODULES[name].desc.length>100, name+' missing operation limitations');
  }
  // A complete offline fixture proves SANS still downloads from same-origin /data/feeds,
  // decompresses its payload, parses records and performs local batch matching.
  const rawSans = Buffer.from('8.8.8.8\tfixture-bad-ip\n1.1.1.1\tfixture-known-ip\n');
  const zippedSans = gzipSync(rawSans);
  const sansInfo = {
    path: 'data/feeds/sans-threatintel.txt.gz',
    sha256: createHash('sha256').update(rawSans).digest('hex'),
    raw_bytes: rawSans.byteLength, compressed_bytes: zippedSans.byteLength,
    source_retrieved_at: '2026-10-09T05:17:00Z',
  };
  const recordedUrls = [];
  globalThis.fetch = async url => {
    recordedUrls.push(String(url));
    if (String(url).includes('/data/feeds/manifest.json'))
      return new Response(JSON.stringify({schema_version:1,generated_at:'2026-10-09T05:20:00Z',datasets:{sans_threatintel:sansInfo}}),{status:200});
    if (String(url).includes('/data/feeds/sans-threatintel.txt.gz'))
      return new Response(zippedSans,{status:200,headers:{'content-length':String(zippedSans.length)}});
    throw new Error('SANS bulk lookup attempted an unexpected external fetch: ' + url);
  };
  const sans = await lookupSansBulk('8.8.8.8\n1.1.1.1\n8.8.4.4','JSON','Bulk (cached or download)','Threatintel labels');
  const sansRows = JSON.parse(sans.output);
  assert.equal(sansRows.length,3);
  assert.deepEqual(sansRows.map(row=>row.found),[true,true,false]);
  assert(sansRows[0].threatintel_labels?.includes('fixture-bad-ip'));
  assert.equal(recordedUrls.length,2, 'SANS bulk should fetch only manifest and mirrored feed');
  assert(recordedUrls.every(url=>url.includes('/data/feeds/')));
  console.log('PASS: SANS mirror gzip decode, three local IP matches, zero upstream requests');
  console.log('PASS: GeoJS 45 IPs -> 3 bulk requests; no PTR requests');
  console.log('PASS: GeoJS PTR cap and stable output order');
  console.log('PASS: IPinfo Lite fallback + anonymous safety cap');
  console.log('PASS: SANS/ARIN no redundant connection panels, no SANS import operation');
  console.log('PASS: Provider limitations registered');
} finally { globalThis.fetch=originalFetch; }
