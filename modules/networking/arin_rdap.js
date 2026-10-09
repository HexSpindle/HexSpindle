// SPDX-License-Identifier: MIT
// Extended RIR allocation lookup + opt-in authoritative RDAP records.
import { module } from './_cat.js';
import { A } from '../../core/registry.js';
import { OUTPUT_FORMATS, enrichmentResult, extractIps, fetchJson, parallelIpOptions } from './_ip_enrichment.js';
import { lookupLocalAllocations } from './_rir_delegations.js';
import { installFeedStatusUI } from './_feed_status_ui.js';
installFeedStatusUI();

const API='https://rdap-bootstrap.arin.net/bootstrap';
const HEADERS={Accept:'application/rdap+json, application/json'};
const MODES=['Live RDAP (detailed)', 'Local allocation (all RIRs)', 'Hybrid (local + live RDAP)'];
const sleep=ms=>new Promise(resolve=>setTimeout(resolve,ms));

function vcardValues(vcardArray) {
  const result={name:'',email:''};
  const items=Array.isArray(vcardArray?.[1])?vcardArray[1]:[];
  for(const item of items) {
    if (!Array.isArray(item)||item.length<4) continue;
    if ((item[0]==='fn'||item[0]==='org')&&!result.name)
      result.name=Array.isArray(item[3])?item[3].join(' '):String(item[3]??'');
    if (item[0]==='email'&&!result.email) result.email=String(item[3]??'');
  }
  return result;
}
function extractEntities(entities,out={org_name:'',org_handle:'',abuse_contact:'',tech_contact:'',admin_contact:''}) {
  for(const entity of Array.isArray(entities)?entities:[]) {
    const roles=entity?.roles||[],handle=entity?.handle||'',vcard=vcardValues(entity?.vcardArray);
    if(roles.includes('registrant')) {
      if(!out.org_name) out.org_name=vcard.name||entity?.name||'';
      if(!out.org_handle) out.org_handle=handle;
    }
    if(roles.includes('abuse')&&!out.abuse_contact) out.abuse_contact=vcard.email||handle;
    if(roles.includes('technical')&&!out.tech_contact) out.tech_contact=vcard.email||handle;
    if(roles.includes('administrative')&&!out.admin_contact) out.admin_contact=vcard.email||handle;
    extractEntities(entity?.entities,out);
  }
  return out;
}
function extractCidrs(data) {
  const cidrs=[];
  for(const item of data?.cidr0_cidrs||[]) {
    if(typeof item==='string') cidrs.push(item);
    else if(item&&typeof item==='object') {
      const prefix=item.v4prefix||item.v6prefix;
      if(prefix&&item.length!=null) cidrs.push(`${prefix}/${item.length}`);
    }
  }
  if(!cidrs.length&&data?.startAddress&&data?.endAddress) cidrs.push(`${data.startAddress} - ${data.endAddress}`);
  if(data?.network&&!cidrs.includes(data.network)) cidrs.push(data.network);
  return cidrs;
}
export function parseRdap(data) {
  const events={registration_date:'',last_changed_date:'',expiration_date:''};
  for(const e of data?.events||[]) {
    if(e?.eventAction==='registration') events.registration_date=e.eventDate||'';
    else if(e?.eventAction==='last changed') events.last_changed_date=e.eventDate||'';
    else if(e?.eventAction==='expiration') events.expiration_date=e.eventDate||'';
  }
  const remarks=[];
  for(const remark of data?.remarks||[]) {
    if(remark?.title) remarks.push(`[${remark.title}]`);
    if(Array.isArray(remark?.description)) remarks.push(...remark.description);
    else if(remark?.description) remarks.push(String(remark.description));
  }
  const cidrs=extractCidrs(data);
  return {
    handle:data?.handle||'', name:data?.name||'',type:data?.type||'',parent_handle:data?.parentHandle||'',
    cidr_count:cidrs.length,cidrs,primary_cidr:cidrs[0]||'',ip_version:data?.ipVersion||'',
    start_address:data?.startAddress||'',end_address:data?.endAddress||'',country:data?.country||'',
    status:Array.isArray(data?.status)?data.status.join('; '):String(data?.status||''),
    ...extractEntities(data?.entities),...events,remarks:remarks.join(' | ').slice(0,1000),
    whois_server:data?.port43||'',object_class:data?.objectClassName||'',
  };
}

const rdapCache=new Map();
async function fetchLive(ip) {
  const old=rdapCache.get(ip);
  if (old && Date.now()-old.at<30*60*1000) return old.data;
  for (let attempt=0; attempt<3; attempt++) {
    const {response,data}=await fetchJson(`${API}/ip/${encodeURIComponent(ip)}`,{headers:HEADERS},20000,[429,503]);
    if(response.status===429||response.status===503) {
      const sec=Number(response.headers.get('Retry-After'));
      const retryMs=Number.isFinite(sec)&&sec>0?sec*1000:Math.min(15000,1000*2**attempt);
      if(attempt===2) throw new Error(`RDAP HTTP ${response.status} (rate limited/unavailable)`);
      await sleep(Math.min(30000,retryMs));
      continue;
    }
    const parsed=parseRdap(data||{});
    if(rdapCache.size>2000) rdapCache.clear();
    rdapCache.set(ip,{at:Date.now(),data:parsed});
    return parsed;
  }
}
async function liveRows(ips) {
  // Bounded pool, with spacing between request starts to reduce RIR load.
  const rows=new Array(ips.length);let next=0;let nextAt=0;
  async function worker() {
    while(next<ips.length) {
      const i=next++,ip=ips[i];
      const now=Date.now(),delay=Math.max(0,nextAt-now);
      nextAt=Math.max(now,nextAt)+350;
      if(delay) await sleep(delay);
      try { rows[i]={ip,...await fetchLive(ip)}; }
      catch(e) { rows[i]={ip,error:e?.message||String(e)}; }
    }
  }
  await Promise.all(Array.from({length:Math.min(3,ips.length)},worker));
  return rows;
}
export async function lookupArin(input, output='JSON', mode=MODES[0]) {
  const ips=extractIps(input);
  if(mode===MODES[0]) return enrichmentResult('arin_rdap',await liveRows(ips),output);
  const local=await lookupLocalAllocations(input,ips);
  if(mode===MODES[1]) return enrichmentResult('arin_rdap',local,output);
  if(mode===MODES[2]) {
    const detailed=await liveRows(ips);
    const rows=local.map((row,i)=>({...row,rdap:detailed[i]?.error?{error:detailed[i].error}:detailed[i]}));
    return enrichmentResult('arin_rdap',rows,output);
  }
  throw new Error(`Unknown ARIN RDAP lookup mode ${mode}`);
}

module('ARIN RDAP',
  'Choose full live authoritative RDAP registration information, fast offline allocation lookups from five daily RIR statistics feeds, or hybrid. Local allocations contain no registered organization, contacts or sub-assignments. Live queries are bounded/rate-limited. Feed sync dates are shown below this description in the recipe card.',
  [A.select('Output',OUTPUT_FORMATS,'JSON'),A.select('Lookup mode',MODES,MODES[0])],
  lookupArin,
  { ...parallelIpOptions('arin_rdap'), aliases:['RDAP','ARIN','IP registration','WHOIS','RIR Delegations'] }
);
