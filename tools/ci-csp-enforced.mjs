#!/usr/bin/env node
// CI-only CSP browser checks. Shared policy/server: ci-csp-shared.mjs.
import { createRequire } from 'node:module';
import { POLICY, startCspServer } from './ci-csp-shared.mjs';
const { chromium } = createRequire(import.meta.url)('playwright');
const server = await startCspServer({ binaryFixture:true });
let browser;
try {
  browser=await chromium.launch();
  const page=await browser.newPage();
  await page.addInitScript(()=>{
    window.__cspFindings=[];
    document.addEventListener('securitypolicyviolation', e => {
      window.__cspFindings.push({directive:e.violatedDirective, blocked:e.blockedURI, disposition:e.disposition});
    });
  });
  const origin=`http://127.0.0.1:${server.address().port}`;
  const nav=await page.goto(origin+'/',{waitUntil:'load'});
  if (!nav.headers()['content-security-policy']) throw Error('Enforced CSP header missing');
  const tests=await page.evaluate(async origin=>{
    await import('./modules/index.js');
    const { MODULES }=await import('./core/registry.js');
    const { bake }=await import('./core/engine.js');
    const { encodeUtf8 }=await import('./core/util.js');
    const cases=[
      {label:'Render Markdown safely',input:'**Hello** <script>alert(1)</script>',
       recipe:[{module:'Render Markdown',args:[false,true,false]}],
       verify:out=>out.includes('<strong>Hello</strong>')&&!out.includes('<script>')},
      {label:'Diff HTML escaping',input:'<img src=x onerror=alert(1)>\n\nnew',
       recipe:[{module:'Diff',args:['\\n\\n','Character',true,true,false,false]}],
       verify:out=>out.includes('&lt;')&&!out.includes('<img')},
      {label:'UTF-8 text encoder',input:'سلام🌍',
       recipe:[{module:'Encode text',args:['UTF-8']}],
       verify:(out,bytes)=>Array.from(bytes,x=>x.toString(16).padStart(2,'0')).join('')==='d8b3d984d8a7d985f09f8c8d'},
      {label:'Base64 encoding',input:'HexSpindle',
       recipe:[{module:'To Base64',args:[]}],
       verify:out=>out==='SGV4U3BpbmRsZQ=='},
      {label:'HTTP request binary response',input:'',
       recipe:[{module:'HTTP request',args:['GET',origin+'/__csp_http_fixture__','','Body',30,true,'None','','',true,10,'',true,1,0,'']}],
       verify:(out,bytes)=>bytes.length===6&&[0,1,2,127,128,255].every((v,i)=>bytes[i]===v)}
    ];
    const result=[];
    for(const c of cases){
      try{
        const r=await bake(encodeUtf8(c.input),c.recipe);
        if(r.error) throw Error(r.error.message);
        const out=new TextDecoder().decode(r.output);
        if(!c.verify(out,r.output)) throw Error('unexpected output: '+out.slice(0,180));
        result.push({label:c.label,ok:true});
      }catch(e){result.push({label:c.label,ok:false,error:String(e.message||e)});}
    }
    return {result,findings:window.__cspFindings};
  },origin);
  for (const t of tests.result) console.log(`${t.ok?'PASS':'FAIL'} ${t.label}${t.ok?'':': '+t.error}`);
  console.log(`Enforced CSP violations after operation tests: ${tests.findings.length}`);
  for(const f of tests.findings.slice(0,30)) console.log(`ADVISORY ${f.directive}: ${f.blocked}`);
  if(tests.result.some(x=>!x.ok) || tests.findings.length) process.exitCode=1;
  if(!process.exitCode) console.log('PASS enforced CSP operation regression suite');
} finally {
  if(browser) await browser.close();
  await new Promise(done=>server.close(done));
}
