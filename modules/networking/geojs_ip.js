// SPDX-License-Identifier: MIT
// GeoJS supports multiple IPs in a single geo endpoint request.
import { module } from './_cat.js';
import { A } from '../../core/registry.js';
import { OUTPUT_FORMATS, enrichmentResult, extractIps, fetchJson, mapIps, parallelIpOptions, publicConnection, pruneEmpty } from './_ip_enrichment.js';
import { parseIp } from './_mmdb.js';

const SERVICE = 'geojs';
const SIZE = 20; // conservative GET URL length even for IPv6 inputs
const ipKey = ip => { const b=parseIp(ip); return b?Array.from(b).join('.') : null; };
const wait = ms => new Promise(resolve => setTimeout(resolve,ms));
function normalize(data, ptr) {
  return pruneEmpty({
    country:data?.country,country_code:data?.country_code,country_code3:data?.country_code3,
    continent_code:data?.continent_code,region:data?.region,city:data?.city,
    latitude:data?.latitude == null?undefined:Number(data.latitude),
    longitude:data?.longitude == null?undefined:Number(data.longitude),
    accuracy_km:data?.accuracy,timezone:data?.timezone,asn:data?.asn,
    organization_name:data?.organization_name,ptr,
  });
}
async function geoChunk(ips) {
  const url = 'https://get.geojs.io/v1/ip/geo.json?ip='+encodeURIComponent(ips.join(','));
  const {data}=await fetchJson(url,{headers:{Accept:'application/json'}},25000);
  const map=new Map();
  for(const item of Array.isArray(data)?data:[data]) {
    const key=ipKey(item?.ip); if(key && !map.has(key)) map.set(key,item);
  }
  return ips.map(ip => ({ip, ...(map.has(ipKey(ip))?normalize(map.get(ipKey(ip))):{error:'GeoJS bulk response omitted this IP'})}));
}
export async function lookupGeoJS(input, includePtr=false, output='JSON') {
  const ips=extractIps(input);
  if (includePtr && ips.length > 20) throw new Error('GeoJS PTR is one request per IP. Limit this run to 20 IPs or disable Include PTR lookup.');
  const rows=[];
  for(let i=0;i<ips.length;i+=SIZE) {
    if(i) await wait(300); // avoid burst traffic
    const chunk=ips.slice(i,i+SIZE);
    try { rows.push(...await geoChunk(chunk)); }
    catch(e) { rows.push(...chunk.map(ip=>({ip,error:e?.message||String(e)}))); }
  }
  if(includePtr) {
    const ptrRows=await mapIps(input,async ip=>{
      try { const r=await fetchJson(`https://get.geojs.io/v1/dns/ptr/${encodeURIComponent(ip)}.json`,{headers:{Accept:'application/json'}}); return {ptr:r.data?.ptr}; }
      catch { return {}; }
    },{delayMs:300});
    const ptr=new Map(ptrRows.map(r=>[ipKey(r.ip),r.ptr]));
    for(const row of rows) if(ptr.get(ipKey(row.ip)))row.ptr=ptr.get(ipKey(row.ip));
  }
  return enrichmentResult(SERVICE,rows,output);
}
export async function testGeoJSConnection() {
  try {await geoChunk(['8.8.8.8']);return {ok:true,message:'Connected to GeoJS bulk Geo endpoint.'};}
  catch(e){return {ok:false,message:e.message};}
}
module('GeoJS IP Lookup',
  'Uses the official GeoJS multi-IP Geo endpoint (up to 20 IPs/request); no full downloadable GeoJS database. Optional PTR adds one DNS request per IP and is limited to 20 IPs per run. No API key. Geographic results are approximate and may differ from local GeoIP files.',
  [A.boolean('Include PTR lookup (20 IP max)',false),A.select('Output',OUTPUT_FORMATS,'JSON')],
  lookupGeoJS,
  {...parallelIpOptions(SERVICE),aliases:['GeoJS','Geo IP','PTR'],connection:publicConnection(SERVICE,testGeoJSConnection,'No credential required. Tests the multi-IP endpoint; separate PTR requests may still fail.')}
);
