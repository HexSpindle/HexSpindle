/* MIT - HexSpindle site-usage telemetry with an always-available opt-out.
 * No consent popup. Configuration is disabled until endpoint meta is set.
 * Do not send forensic content, URLs, inputs, outputs, recipes, filenames,
 * credentials, operation arguments, or search text.
 * LEGAL REVIEW REQUIRED before deploying to every region: the operator must
 * determine which visitors require prior consent and configure accordingly.
 */
const META = document.querySelector('meta[name="hexspindle-analytics-endpoint"]');
const ENDPOINT = META?.content?.trim() || '';
const VALID_ENDPOINT = location.origin === 'https://hexspindle.github.io' && /^https:\/\/[a-z0-9-]+\.[a-z0-9-]+\.workers\.dev\/v1\/events$/i.test(ENDPOINT);
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
export function trackExecution(recipe,steps,mode='auto'){
 if(!canTrack())return;
 const m=['auto','manual','sequential','inspect','batch'].includes(mode)?mode:'auto';
 push({type:'recipe_run',mode:m});
 for(let i=0;i<Math.min(recipe?.length||0,steps?.length||0);i++){
   const item=recipe[i],st=steps[i];
   if(!item||!st||item.disabled||st.skipped||st.cached||st.inblock)continue;
   const name=String(item.module||''),category=String(item.category||'');
   if(!VALID_NAME.test(name)||!VALID_NAME.test(category))continue;
   const t={type:'operation_executed',operation:name,category,mode:m,status:st.error?'error':'ok'};
   if(Number.isFinite(st.ms)&&st.ms>=0)t.duration_ms=Math.min(86400000,Math.round(st.ms));
   push(t);
 }
}
function button(label,cb){const b=document.createElement('button');b.type='button';b.textContent=label;b.addEventListener('click',cb);b.style.cssText='border:1px solid #64748b;border-radius:7px;background:#1a3349;color:#e9f4ff;padding:5px 9px;cursor:pointer';return b;}
function stopTracking(){
 enabled=false;queue=[];if(flushTimer){clearTimeout(flushTimer);flushTimer=null;}
 visitorId='';sessionId='';local.set(PREFERENCE,'no');local.del(VISITOR);session.del(SESSION);
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
 const a=document.createElement('a');a.href='./analytics/privacy.html';a.textContent='Analytics privacy';a.style.cssText='color:inherit;text-decoration:underline;text-underline-offset:2px;margin-right:9px';
 bar.append(a);
 if(!VALID_ENDPOINT || privacySignal())return;
 const b=enabled?button('Opt out of analytics',stopTracking):button('Enable analytics',startTracking);
 bar.append(b);
}
function initialize(){
 const footer=document.querySelector('footer.status');
 if(footer){const container=document.createElement('span');container.id='hsAnalyticsPrefs';container.style.cssText='margin-left:8px;display:inline-flex;align-items:center;gap:5px;white-space:nowrap';footer.append(container);}
 if(VALID_ENDPOINT && !privacySignal() && local.get(PREFERENCE)!=='no'){
   enabled=true;ensureIds();push({type:'page_view'});
 }
 updateControls();
 addEventListener('pagehide',()=>flush());
}
if(typeof document!=='undefined')initialize();
