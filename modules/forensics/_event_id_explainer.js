// SPDX-License-Identifier: MIT
// Standalone Windows Event ID Explainer. Does not alter other Windows event analyzers.
import { text, safeJson, parseJsonish } from './_common.js';
import { SECURITY_EVENTS, SYSMON_EVENTS } from './_event_id_catalog.js';

// Explain only IDs deliberately supplied by the user or present in parsed event records.
// Never scrape every 1-5-digit number from unstructured JSON/text; timestamps,
// ports, SIDs and other numeric fields are NOT event IDs.
function eventProviderKind(raw) {
  const provider=String(raw??'').trim();
  if (!provider || /^unknown$/i.test(provider)) return 'unspecified';
  if (/sysmon/i.test(provider)) return 'sysmon';
  if (/^(?:security|windows security|microsoft-windows-security-auditing|microsoft-windows-eventlog|eventlog)$/i.test(provider)) return 'security';
  return 'other';
}
function eventNumber(value) {
  if (value && typeof value==='object') value=value.Value??value['#text']??value.value;
  const n=Number(value);return Number.isSafeInteger(n)&&n>=0&&n<=65535?n:null;
}
function eventIdSamples(data) {
  const s=text(data).trim();
  if (!s) throw new Error('Supply a list of event IDs, decoded event XML, or event JSON.');
  if (s.startsWith('ElfFile'))throw new Error('Raw EVTX input detected; run EVTX to JSON or EVTX to XML first.');
  const j=parseJsonish(data);
  const result=[];
  if (j!==null && j!==undefined) {
    const arr=Array.isArray(j)?j:Array.isArray(j.Events)?j.Events:Array.isArray(j.events)?j.events:[j];
    if(arr.length>100000)throw new Error('Too many event records for the ID explainer (limit: 100000).');
    for(const item of arr) {
      const obj=(item&&typeof item==='object')?item:{eventId:item};
      const sys=obj.System||obj.system||{};
      const id=eventNumber(obj.eventId??obj.EventID??obj.EventId??obj.Id??sys.EventID??sys.EventId);
      if(id===null)continue;
      const pv=sys.Provider||sys.provider;
      const provider=obj.ProviderName??obj.providerName??obj.provider??(typeof pv==='string'?pv:pv?.Name??pv?.name)??'';
      result.push({id,provider});
    }
    if(!result.length)throw new Error('JSON does not contain event IDs (expected eventId/EventID/Id or System.EventID).');
    return result;
  }
  if(/<Event\b/i.test(s)) {
    const blocks=[...s.matchAll(/<Event\b[\s\S]*?<\/Event>/gi)];
    if(!blocks.length)throw new Error('Invalid event XML: expected complete <Event> elements.');
    for(const match of blocks){
      const xml=match[0],m=/<EventID\b[^>]*>\s*(\d{1,5})\s*<\/EventID>/i.exec(xml);
      if(!m)continue;
      const pm=/<Provider\b[^>]*\bName\s*=\s*["']([^"']+)["']/i.exec(xml);
      result.push({id:Number(m[1]),provider:pm?.[1]||''});
    }
    if(!result.length)throw new Error('Event XML has no readable <EventID> elements.');
    return result;
  }
  // Unqualified ID sequences: comma/space/newline-separated numbers (no other facts).
  if(/^[\s\d,;|]+$/.test(s)) {
    for(const part of s.split(/[\s,;|]+/).filter(Boolean)) {
      const id=eventNumber(part);if(id!==null)result.push({id,provider:''});
    }
  } else {
    // Deliberate, line-oriented event IDs with optional provider labels, e.g.
    // "Sysmon 1", "Security: 4624", "Event ID 4625", "4624(S)".
    for(const line of s.split(/\r?\n/)) {
      const t=line.trim();if(!t)continue;
      let m=/^(?:(Microsoft-Windows-[\w-]+|Sysmon|Security|Windows Security)\s*[:#-]?\s*)?(?:Event\s*ID\s*[:#-]?\s*)?(\d{1,5})(?:\s*\([^)]{1,6}\))?(?:\s*[:\-]\s*.*)?$/i.exec(t);
      if(!m)m=/^Event\s*ID\s*[:#-]?\s*(\d{1,5})\b/i.exec(t);
      if(m)result.push({id:Number(m.length===3?m[2]:m[1]),provider:m.length===3?(m[1]||''):''});
    }
  }
  if(!result.length)throw new Error('No event IDs found. Enter numeric IDs separated by commas/newlines or JSON/XML event records.');
  if(result.length>100000)throw new Error('Too many event IDs (limit: 100000).');
  return result;
}
export function explainWindowsEventId(data) {
  const samples=eventIdSamples(data);
  const uniq=new Map();
  for(const sample of samples){const kind=eventProviderKind(sample.provider),key=kind+':'+sample.id;
    if(!uniq.has(key))uniq.set(key,{...sample,kind,count:0});uniq.get(key).count++;
  }
  const out=[];
  for(const {id,provider,kind,count} of uniq.values()){
    let row=null,meaning='',source='',category='',subcategory='',outcome='',resolution='unknown';
    const ms=SECURITY_EVENTS[id];const sys=SYSMON_EVENTS[id];
    if(kind==='sysmon'){
      if(sys){meaning=sys;source='Microsoft Sysmon';category='Sysmon';resolution='documented';}
    }else if(kind==='security'||kind==='unspecified'){
      if(ms){[meaning,category,subcategory,outcome,source]=ms;source=source==='M'?'Microsoft (2016 security auditing reference)':'Supplemental Windows Security reference';resolution='documented';}
      else if(id===8191){meaning='Highest system-defined audit message value (reference boundary; not a recorded event)';source='Windows Security reference';category='Reference only';resolution='reference-only';}
      else if(kind==='unspecified'&&sys){meaning=sys;category='Sysmon';source='Microsoft Sysmon';resolution='provider-unconfirmed';}
    }
    if(kind==='other')resolution='unknown';
    const providerName=provider&& !/^unknown$/i.test(provider)?provider:(category==='Sysmon'?'Sysmon':resolution==='documented'?'Security':'Unknown');
    out.push({eventId:id,provider:providerName,meaning:meaning||'No verified explanation for this provider and ID',
      category:category||null,subcategory:subcategory||null,auditOutcome:outcome||null,
      source:source||null,referenceUrl:source.startsWith('Microsoft (2016')?'https://www.microsoft.com/en-us/download/details.aspx?id=52630':source==='Microsoft Sysmon'?'https://learn.microsoft.com/en-us/sysinternals/downloads/sysmon':source==='Supplemental Windows Security reference'?'https://www.ultimatewindowssecurity.com/securitylog/encyclopedia/default.aspx':null,resolution,occurrences:count,
      note:resolution==='provider-unconfirmed'?'Meaning applies only to Microsoft Sysmon; verify the event provider before interpreting.'
        :resolution==='unknown'?'Event ID alone is insufficient when a provider is specified or undocumented; check the source event provider, channel and Windows version.'
        :resolution==='reference-only'?'Reference marker, not an event you should hunt for.'
        :'Concise reference description; interpret with provider/channel, audit policy, event version and actual event fields.'});
  }
  return safeJson(out);
}

