// SPDX-License-Identifier: MIT
import { module } from './_cat.js';
import { A } from '../../core/registry.js';
import { OUTPUT_FORMATS, enrichmentResult, extractIps, fetchJson, mapIps, parallelIpOptions, publicConnection, pruneEmpty } from './_ip_enrichment.js';
import { getLiteDataset, matchLite } from './_ipinfo_lite.js';

const SERVICE = 'ipinfo_io';
const MODES = ['Auto (prefer local Lite if published)','Local IPinfo Lite (country + ASN only)','Anonymous legacy API (limited)'];
const MAX_ANONYMOUS = 25;
async function query(ip) { const {data}=await fetchJson(`https://ipinfo.io/${encodeURIComponent(ip)}/json`,{headers:{Accept:'application/json'}});return data||{}; }
function parse(data) {
  let latitude,longitude;
  if(typeof data?.loc==='string'){
    const [lat,lon]=data.loc.split(',').map(Number);
    if(Number.isFinite(lat))latitude=lat;if(Number.isFinite(lon))longitude=lon;
  }
  let asn,as_name;
  if(typeof data?.org==='string'){
    const m=data.org.match(/^(AS\d+)\s*(.*)$/i);
    if(m){asn=m[1];as_name=m[2];}else as_name=data.org;
  }
  if(data?.asn&&typeof data.asn==='object'){
    asn=data.asn.asn||asn;as_name=data.asn.name||as_name;
  }
  return pruneEmpty({hostname:data?.hostname,city:data?.city,region:data?.region,country:data?.country,
    postal:data?.postal,timezone:data?.timezone,latitude,longitude,asn,as_name,
    as_domain:data?.asn?.domain,route:data?.asn?.route,as_type:data?.asn?.type,
    anycast:data?.anycast??data?.is_anycast,bogon:data?.bogon});
}
export async function lookupIPInfo(input,output='JSON',mode=MODES[0]){
  const ips=extractIps(input);let lite=null,reason='';
  if(mode!==MODES[2]){
    try{lite=await getLiteDataset();}catch(e){reason=e?.message||String(e);}
    if(mode===MODES[1]&&!lite)throw new Error(`IPinfo Lite is not published or cache unavailable${reason?': '+reason:''}. Configure IPINFO_LITE_TOKEN in the Pages repository.`);
  }
  if(lite)return enrichmentResult(SERVICE,ips.map(ip=>({ip,...matchLite(ip,lite)})),output);
  if(ips.length>MAX_ANONYMOUS)throw new Error(`IPinfo anonymous API is limited by HexSpindle to ${MAX_ANONYMOUS} IPs per run because the provider enforces a shared 1,000/day per-source-IP limit. Configure IPinfo Lite to run larger batches locally.`);
  const rows=await mapIps(input,async ip=>parse(await query(ip)),{delayMs:300});
  return enrichmentResult(SERVICE,rows,output);
}
export async function testIPInfoConnection(){try{await query('8.8.8.8');return{ok:true,message:'Connected to IPinfo anonymous legacy endpoint.'};}catch(e){return{ok:false,message:e.message};}}
module('IPInfo.io Basic',
  'Default: locally indexed IPinfo Lite when published via Actions (country, continent, ASN/name/domain only; daily, CC BY-SA 4.0), else legacy anonymous API capped at 25 IPs/run, 300 ms between requests (provider: shared 1,000 requests/day/IP). Lite does NOT provide city, hostname, region, lat/lon, timezone or historical attribution. Configure Pages secret IPINFO_LITE_TOKEN to enable offline bulk Lite; access and redistribution require IPinfo attribution.',
  [A.select('Output',OUTPUT_FORMATS,'JSON'),A.select('Lookup mode',MODES,MODES[0])],
  lookupIPInfo,
  {...parallelIpOptions(SERVICE),aliases:['IPinfo','IPInfo.io','IPinfo Lite'],connection:publicConnection(SERVICE,testIPInfoConnection,'Tests the anonymous endpoint, not the optional GitHub Actions IPinfo Lite snapshot.')}
);
