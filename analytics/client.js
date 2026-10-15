/* MIT - HexSpindle site-usage telemetry with an always-available opt-out.
 * No consent popup. Configuration is disabled until endpoint meta is set.
 * Do not send forensic content, URLs, inputs, outputs, recipe arguments, filenames,
 * credentials, operation arguments, or search text.
 * LEGAL REVIEW REQUIRED before deploying to every region: the operator must
 * determine which visitors require prior consent and configure accordingly.
 */
const META = document.querySelector('meta[name="hexspindle-analytics-endpoint"]');
const ENDPOINT = META?.content?.trim() || '';
// The portable launcher (desktop/) serves the app at http://127.0.0.1:<port>/ and marks the pages it serves.
const LAUNCHER = /^http:\/\/127\.0\.0\.1:\d{1,5}$/.test(location.origin) && !!document.querySelector('meta[name="hexspindle-launcher"]');
const VALID_ENDPOINT = (location.origin === 'https://hexspindle.github.io' || LAUNCHER) && /^https:\/\/[a-z0-9-]+\.[a-z0-9-]+\.workers\.dev\/v1\/events$/i.test(ENDPOINT);
const PREFERENCE = 'hexspindle.analytics.preference.v1';
const VISITOR = 'hexspindle.analytics.visitor.v1';
const SESSION = 'hexspindle.analytics.session.v1';
const QUEUE_MAX = 20;
const VALID_NAME = /^[\p{L}\p{N} _\-+.():/#&,'\[\]%°]{0,100}$/u;
let enabled = false;
let visitorId = '';
let sessionId = '';
let queue = [];
let flushTimer = null;
let restrictedRequestLogged = false;
function restrictionReason() {
 if(navigator.globalPrivacyControl===true)return 'GPC';
 if(navigator.doNotTrack==='1')return 'DNT';
 if(local.get(PREFERENCE)==='no')return 'OPT_OUT';
 return null;
}
function recordRestrictedRequest() {
 const reason=restrictionReason();
 if(restrictedRequestLogged || !VALID_ENDPOINT || !reason)return;
 restrictedRequestLogged=true; // once per page load, never a persistent visitor ID
 // The separate Worker route records only the network IP, country, reason and timestamp.
 // This route is disabled server-side until the new privacy notice is published.
 const url=ENDPOINT.replace(/\/v1\/events$/, '/v1/restricted');
 try{fetch(url,{method:'POST',mode:'cors',credentials:'omit',cache:'no-store',keepalive:true,
   headers:{'Content-Type':'text/plain;charset=UTF-8'},body:JSON.stringify({reason})}).catch(()=>{});}catch{}
}

const local = { get(k){try{return localStorage.getItem(k)}catch{return null}},set(k,v){try{localStorage.setItem(k,v)}catch{}},del(k){try{localStorage.removeItem(k)}catch{}} };
const session = { get(k){try{return sessionStorage.getItem(k)}catch{return null}},set(k,v){try{sessionStorage.setItem(k,v)}catch{}},del(k){try{sessionStorage.removeItem(k)}catch{}} };
const randomID = () => crypto.randomUUID();
function privacySignal() { return navigator.globalPrivacyControl === true || navigator.doNotTrack === '1'; }
function canTrack() { return VALID_ENDPOINT && enabled && !privacySignal(); }
function ensureIds(){visitorId=local.get(VISITOR)||randomID();local.set(VISITOR,visitorId);sessionId=session.get(SESSION)||randomID();session.set(SESSION,sessionId);}
function push(e){if(!canTrack()||!e||typeof e!=='object')return;queue.push(e);if(queue.length>=QUEUE_MAX)flush();else if(!flushTimer)flushTimer=setTimeout(flush,1700);}
function flush(){if(flushTimer){clearTimeout(flushTimer);flushTimer=null;}if(!canTrack()||!queue.length)return;
 const events=queue.splice(0,QUEUE_MAX);
 const data=JSON.stringify({visitor_id:visitorId,session_id:sessionId,events});
 // Metadata only; delivery does not depend on success and never blocks the workbench.
 try{fetch(ENDPOINT,{method:'POST',mode:'cors',credentials:'omit',cache:'no-store',keepalive:true,headers:{'Content-Type':'text/plain;charset=UTF-8'},body:data}).catch(()=>{});}catch{}
 if(queue.length)flushTimer=setTimeout(flush,500);
}
export function trackOperationAdded(name){if(VALID_NAME.test(name||''))push({type:'operation_added',operation:name});}
export function trackFeature(name){if(VALID_NAME.test(name||''))push({type:'feature_used',operation:name});}
// A recipe run has a stable ID and a safe, ordered metadata-only snapshot.
// Engine j.steps is an object keyed by zero-based recipe index (NOT an array).
const RECIPE_LIMIT = 50;
export function trackExecution(recipe, steps, mode='auto') {
 if (!canTrack() || !Array.isArray(recipe)) return;
 const m=['auto','manual','sequential','inspect','batch'].includes(mode)?mode:'auto';
 const run_id=randomID();
 const safe=(value)=>{const s=String(value||'');return VALID_NAME.test(s)?s:'';};
 const ordered=[];const executed=[];
 for(let i=0;i<Math.min(recipe.length,RECIPE_LIMIT);i++){
   const item=recipe[i]||{};
   const st=steps?.[i]; // Engine returns an object indexed by recipe position.
   const operation=safe(item.module),category=safe(item.category);
   let state='pending';
   if(item.disabled)state='disabled';
   else if(st?.inblock)state='nested';
   else if(st?.skipped)state='skipped';
   else if(st?.cached)state='cached';
   else if(st)state=st.error?'error':'ok';
   const entry={index:i,operation,category,state};
   if(Number.isFinite(st?.ms)&&st.ms>=0)entry.duration_ms=Math.min(86400000,Math.round(st.ms));
   ordered.push(entry);
   if((state==='ok'||state==='error')&&operation){
     const e={type:'operation_executed',operation,category,mode:m,status:state,run_id,step_index:i};
     if(entry.duration_ms!=null)e.duration_ms=entry.duration_ms;
     executed.push(e);
   }
 }
 // Flush preceding page/feature telemetry first, so the run record stays in
 // its own small request and does not exceed the collector body-size limit.
 flush();
 const failures=ordered.some(s=>s.state==='error');
 // Public collector rejects bodies over 12 KB. Keep the run envelope below 10 KB.
 while(ordered.length>1 && new TextEncoder().encode(JSON.stringify({visitor_id:visitorId,session_id:sessionId,
   events:[{type:'recipe_run',mode:m,status:failures?'error':'ok',run_id,
     recipe_size:recipe.length,recipe_truncated:true,recipe_steps:ordered}]})).length>9500)
   ordered.pop();
 push({type:'recipe_run',mode:m,status:failures?'error':'ok',run_id,
   recipe_size:recipe.length,recipe_truncated:recipe.length>ordered.length,
   recipe_steps:ordered});
 flush();
 for(const e of executed)push(e);
}

// The footer reports the current privacy state even if analytics is disabled.
function footerButton(label, callback){
 const b=document.createElement('button');
 b.type='button';
 b.className='hs-analytics-action';
 b.textContent=label;
 b.addEventListener('click',callback);
 return b;
}
function footerState(label,kind,title){
 const on=kind==='is-on';
 const e=document.createElement(on?'a':'span');
 e.className='hs-analytics-state '+kind;
 e.textContent=label;
 if(on){
   e.href='./analytics/privacy.html';
   e.setAttribute('aria-label','Analytics on — view analytics privacy notice');
   e.title='View analytics privacy notice';
 }else{
   // Keyboard focus also exposes the reason on touch devices.
   e.tabIndex=0;
   e.dataset.reason=title;
   e.setAttribute('aria-label',label+'. '+title);
   e.title=title;
 }
 return e;
}
function stopTracking(){
 enabled=false;queue=[];if(flushTimer){clearTimeout(flushTimer);flushTimer=null;}
 visitorId='';sessionId='';local.set(PREFERENCE,'no');local.del(VISITOR);session.del(SESSION);
 recordRestrictedRequest();
 updateControls();
}
function startTracking(){
 if(privacySignal())return;
 local.set(PREFERENCE,'yes');enabled=VALID_ENDPOINT;
 if(enabled){ensureIds();push({type:'page_view'});flush();}
 updateControls();
}
function updateControls(){
 const bar=document.getElementById('hsAnalyticsPrefs');if(!bar)return;
 bar.replaceChildren();
 if(!VALID_ENDPOINT){
   bar.append(footerState('Analytics off','is-off','Analytics endpoint is not configured for this site.'));
   return;
 }
 if(navigator.globalPrivacyControl===true){
   bar.append(footerState('Analytics off','is-off','Disabled by Global Privacy Control (GPC).'));
   return;
 }
 if(navigator.doNotTrack==='1'){
   bar.append(footerState('Analytics off','is-off','Disabled by browser Do Not Track (DNT).'));
   return;
 }
 if(enabled){
   bar.append(footerState('Analytics on','is-on','View analytics privacy notice'));
   bar.append(footerButton('Opt out',stopTracking));
 }else{
   bar.append(footerState('Analytics off','is-off','Disabled by your manual opt-out.'));
   bar.append(footerButton('Enable',startTracking));
 }
}
function initialize(){
 const footer=document.querySelector('footer.status');
 if(footer){
   let container=document.getElementById('hsAnalyticsPrefs');
   if(!container){container=document.createElement('span');container.id='hsAnalyticsPrefs';footer.append(container);}
 }
 if(VALID_ENDPOINT && !privacySignal() && local.get(PREFERENCE)!=='no'){
   enabled=true;ensureIds();push({type:'page_view'});
 }
 recordRestrictedRequest();
 updateControls();
 addEventListener('pagehide',()=>flush());
}
if(typeof document!=='undefined')initialize();
