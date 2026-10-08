// SPDX-License-Identifier: MIT
// Forensic event summaries based on normalized Event XML / JSON. No execution or network.
// Event identities are qualified by provider to avoid unrelated EventID collisions.
import { events, f } from './_logs.js';
import { safeJson } from './_common.js';

const SECURITY = 'microsoft-windows-security-auditing';
const SYSMON = 'microsoft-windows-sysmon';
const TASK = 'microsoft-windows-taskscheduler';
function provider(e) { return String(e.provider || '').toLowerCase(); }
function hasProvider(e, name) { return provider(e).includes(name); }
function security(e) { return hasProvider(e, SECURITY); }
function sysmon(e) { return hasProvider(e, SYSMON); }
function common(e){ return { timestamp: e.time || '', eventId: e.eventId, provider: e.provider || '', computer: e.computer || '' }; }
function limitEvents(input){ const e=events(input); if(e.length>100000)throw new Error('Limit: 100,000 decoded events per operation. Filter or split EVTX before analysis.'); return e; }
const note='Matches indicate logged activity, not proof of intrusion. Event coverage depends on configured auditing and log retention.';

export function eventLogSummary(data){
  const evs=limitEvents(data), byProvider={}, byEvent={};let first='',last='';
  for(const e of evs){ const p=e.provider||'(unavailable)'; byProvider[p]=(byProvider[p]||0)+1;const k=p+' / '+e.eventId;byEvent[k]=(byEvent[k]||0)+1;
    const t=Date.parse(e.time);if(Number.isFinite(t)){ if(!first||t<Date.parse(first))first=e.time; if(!last||t>Date.parse(last))last=e.time; }
  }
  const sort=o=>Object.entries(o).sort((a,b)=>b[1]-a[1]||a[0].localeCompare(b[0])).map(([key,count])=>({name:key,count}));
  return safeJson({ total:evs.length, earliestUtc:first,latestUtc:last,providers:sort(byProvider),events:sort(byEvent),sample:evs.slice(0,8).map(e=>({...common(e),recordId:String(e.raw?.RecordId || e.raw?.System?.EventRecordID || '')})),note:'Summary reflects only the input events. Counts do not prove acquisition completeness.' });
}
export function eventLogIntegrity(data){
 const INFO={1102:['Security audit log cleared','high'],4719:['System audit policy changed','review'],4902:['Per-user audit policy table created','review'],4906:['CrashOnAuditFail setting changed','review'],4912:['Per-user audit policy changed','review'],1100:['Event logging service shut down','review'],1101:['Audit events dropped by transport','high'],1104:['Security audit log full','high']};
 const out=[];
 for(const e of limitEvents(data)){
  const k=INFO[e.eventId];
  if(k && security(e))out.push({...common(e),activity:k[0],reviewPriority:k[1],actor:f(e,'SubjectUserName','SubjectUserSid'),domain:f(e,'SubjectDomainName'),auditPolicy:f(e,'SubcategoryGuid','CategoryId'),note});
  else if(e.eventId===104 && /eventlog/i.test(e.provider))out.push({...common(e),activity:'Event log cleared (provider reports log name)',reviewPriority:'high',logName:f(e,'Channel','LogName','param1'),note});
 }
 return safeJson(out);
}
export function eventAccountChanges(data){
 const INFO={4720:'User account created',4722:'User account enabled',4723:'Password change attempted',4724:'Password reset attempted',4725:'User account disabled',4726:'User account deleted',4728:'Added to global security group',4729:'Removed from global security group',4732:'Added to local security group',4733:'Removed from local security group',4738:'User account changed',4740:'User account locked out',4756:'Added to universal security group',4757:'Removed from universal security group'};
 const out=[];for(const e of limitEvents(data)){if(!security(e)||!INFO[e.eventId])continue;out.push({...common(e),activity:INFO[e.eventId],target:f(e,'TargetUserName','TargetSid'),targetDomain:f(e,'TargetDomainName'),subject:f(e,'SubjectUserName'),subjectDomain:f(e,'SubjectDomainName'),memberSid:f(e,'MemberSid'),memberName:f(e,'MemberName'),group:f(e,'TargetUserName'),note});}return safeJson(out);
}
export function eventScheduledTasks(data){
 const securityInfo={4698:'Task created',4699:'Task deleted',4700:'Task enabled',4701:'Task disabled',4702:'Task updated'};
 const taskInfo={106:'Task registered',140:'Task updated',141:'Task deleted',200:'Task action started',201:'Task action completed',102:'Task completed'};
 const out=[];for(const e of limitEvents(data)){
  const activity=security(e)?securityInfo[e.eventId]:hasProvider(e,TASK)?taskInfo[e.eventId]:null;
  if(!activity)continue;out.push({...common(e),activity,taskName:f(e,'TaskName','TaskPath'),actor:f(e,'SubjectUserName','UserName','UserContext'),taskContent:f(e,'TaskContent','TaskContentNew').slice(0,4096),actionName:f(e,'ActionName'),resultCode:f(e,'ResultCode'),note});
 }return safeJson(out);
}
export function eventProcessExecution(data){
 const out=[];for(const e of limitEvents(data)){
  if(!(security(e)&&e.eventId===4688)&&!(sysmon(e)&&[1,5].includes(e.eventId)))continue;
  out.push({...common(e),activity:security(e)?'Process created (Security 4688)':e.eventId===1?'Process created (Sysmon 1)':'Process terminated (Sysmon 5)',image:f(e,'NewProcessName','Image'),commandLine:f(e,'CommandLine'),parentImage:f(e,'ParentProcessName','ParentImage'),processId:f(e,'NewProcessId','ProcessId'),processGuid:f(e,'ProcessGuid'),user:f(e,'SubjectUserName','User'),parentGuid:f(e,'ParentProcessGuid'),note});
 }return safeJson(out);
}
export function eventSysmonPersistence(data){
 const INFO={12:'Registry object created/deleted',13:'Registry value set',14:'Registry key/value renamed',19:'WMI event filter',20:'WMI event consumer',21:'WMI filter-consumer binding'};
 const out=[];for(const e of limitEvents(data)){if(!sysmon(e)||!INFO[e.eventId])continue;out.push({...common(e),activity:INFO[e.eventId],ruleName:f(e,'RuleName'),image:f(e,'Image'),processGuid:f(e,'ProcessGuid'),targetObject:f(e,'TargetObject'),details:f(e,'Details'),name:f(e,'Name'),query:f(e,'Query'),destination:f(e,'Destination'),consumer:f(e,'Consumer'),note});}return safeJson(out);
}
export function eventSmbShares(data){
 const INFO={5140:'Network share accessed',5142:'Network share created',5143:'Network share modified',5144:'Network share deleted',5145:'Network share access evaluated'};
 const out=[];for(const e of limitEvents(data)){
  if(security(e)&&INFO[e.eventId])out.push({...common(e),activity:INFO[e.eventId],share:f(e,'ShareName','ShareLocalPath'),relativeTarget:f(e,'RelativeTargetName'),sourceIp:f(e,'IpAddress','ClientAddress'),sourcePort:f(e,'IpPort'),account:f(e,'SubjectUserName'),domain:f(e,'SubjectDomainName'),access:f(e,'AccessMask','Accesses'),note});
  else if(hasProvider(e,'microsoft-windows-smbserver'))out.push({...common(e),activity:'SMBServer provider event (vendor-specific ID; no inferred meaning)',share:f(e,'ShareName'),sourceIp:f(e,'IpAddress','ClientIpAddress'),rawClientAddress:f(e,'ClientAddress'),connectionId:f(e,'ConnectionId'),sessionId:f(e,'SessionId'),status:f(e,'Status','ErrorCode'),note:'Provider-specific event; ClientAddress can be binary and is not interpreted as an IP address. Correlate with Microsoft SMBServer logs and Security 5140/5145.'});
 }return safeJson(out);
}
export function eventLogFilter(data,idCsv='',providerSubstring='',maximum=1000){
 const ids=new Set(String(idCsv).split(/[\s,;]+/).filter(Boolean).map(x=>{if(!/^\d+$/.test(x))throw new Error('Event ID filter must contain decimal numbers separated by comma/space');return Number(x);}));
 const search=String(providerSubstring||'').toLowerCase().trim(),max=Math.min(20000,Math.max(1,Number(maximum)||1000));
 const all=limitEvents(data),chosen=[];
 for(const e of all){if(ids.size&&!ids.has(e.eventId))continue;if(search&&!provider(e).includes(search))continue;chosen.push(e.raw&&typeof e.raw==='object'?e.raw:{...common(e),EventData:e.fields});if(chosen.length>=max)break;}
 return safeJson(chosen);
}
