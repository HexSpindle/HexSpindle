// SPDX-License-Identifier: MIT
// Network operation regression tests run in main HexSpindle CI before deployment.
import assert from 'node:assert/strict';
import { lookupGeoJS } from '../modules/networking/geojs_ip.js';
import { lookupIPInfo } from '../modules/networking/ipinfo_io.js';
import { MODULES } from '../core/registry.js';
import '../modules/networking/arin_rdap.js';
import '../modules/networking/sans_isc_ip.js';
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
  for (const name of ['IPInfo.io Basic','GeoJS IP Lookup','RIPEstat IP Intelligence']) {
    assert(MODULES[name].desc.length>100, name+' missing operation limitations');
  }
  console.log('PASS: GeoJS 45 IPs -> 3 bulk requests; no PTR requests');
  console.log('PASS: GeoJS PTR cap and stable output order');
  console.log('PASS: IPinfo Lite fallback + anonymous safety cap');
  console.log('PASS: SANS/ARIN no redundant connection panels; provider limitations registered');
} finally { globalThis.fetch=originalFetch; }
