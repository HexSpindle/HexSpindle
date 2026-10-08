#!/usr/bin/env node
// SPDX-License-Identifier: MIT
// Real Chromium UI regression: upload native bytes using the file picker,
// select an operation and run the actual recipe through the application.
import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {readFileSync} from 'node:fs';
import {readFile as readFileAsync} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import {extname,join,normalize,sep} from 'node:path';
import {createRequire} from 'node:module';
const {chromium}=createRequire(import.meta.url)('playwright');
const ROOT=normalize(join(fileURLToPath(new URL('.',import.meta.url)),'..'));
const MIME={'.html':'text/html','.js':'text/javascript','.mjs':'text/javascript','.css':'text/css','.json':'application/json','.wasm':'application/wasm'};
const serve=()=>new Promise(resolve=>{const server=createServer(async(req,res)=>{
  try {const path=decodeURIComponent((req.url||'/').split('?')[0]);const full=normalize(join(ROOT,path==='/'?'index.html':path.slice(1)));
  if(full!==ROOT&&!full.startsWith(ROOT+sep)){res.writeHead(403).end();return;}
  const body=await readFileAsync(full);res.writeHead(200,{'Content-Type':MIME[extname(full)]||'application/octet-stream'});res.end(body);
  }catch{res.writeHead(404).end('not found');}
});server.listen(0,'127.0.0.1',()=>resolve(server));});
const cases=[
 {file:'evtx-binxml-two-events.evtx',name:'EVTX to JSON',check:x=>Array.isArray(x)&&x.length===2&&x[0]?.EventID===4624&&x[1]?.EventID===4625},
 {file:'evtx-binxml-preallocated.evtx',name:'EVTX to JSON',check:x=>Array.isArray(x)&&x.length===2&&x[0]?.EventID===4624&&x[1]?.EventID===4625},
 {file:'evtx-binxml-preallocated.evtx',name:'Windows EVTX Metadata Inspector',expect:{validRecordFrames:2,validChunks:1,unusedChunkSlots:3}},
 {file:'evtx-header-records-synthetic.evtx',name:'Windows EVTX Metadata Inspector',expect:{validRecordFrames:2,validChunks:1}},
 {file:'registry-value-synthetic.hiv',name:'Windows Registry Hive Inspector',check:x=>x[0]?.values?.some(v=>v.name==='Foo'&&v.value===42)},
 {file:'browser-sqlite-synthetic.db',name:'Chrome History Parser',check:x=>x.some(v=>v.url==='https://example.org/demo')},
];
let server,browser;try{
 server=await serve();browser=await chromium.launch({headless:true});
 for(const t of cases){
  const context=await browser.newContext();const page=await context.newPage();const jsErrors=[];
  page.on('pageerror',e=>jsErrors.push(e.message));
  try {
   await page.goto(`http://127.0.0.1:${server.address().port}/`,{waitUntil:'load'});
   await page.waitForFunction(()=>/\d/.test(document.querySelector('#opCount')?.textContent||''));
   // Disable speculative Auto-Spin before loading raw evidence.
   // The checkbox itself has display:none; Playwright cannot click/uncheck a hidden
   // native control. Click its VISIBLE label, just as a real user would.
   const autoBake = page.locator('#autoBake');
   if (await autoBake.isChecked()) {
     await page.locator('.bake-bar label.switch').click();
   }
   assert.equal(await autoBake.isChecked(), false, 'Auto-Spin should be disabled');
   const bytes=readFileSync(new URL('./fixtures/forensics/'+t.file,import.meta.url));
   await page.locator('#fileInput').setInputFiles({name:t.file,mimeType:'application/octet-stream',buffer:bytes});
   await page.waitForFunction(sz=>(document.querySelector('#inStats')?.textContent||'').includes(sz),bytes.length.toLocaleString('en-US'),{timeout:10000});
   await page.locator('#opSearch').fill(t.name);
   await page.locator('.op').filter({hasText:t.name}).first().waitFor({timeout:10000});
   await page.locator('.op').filter({hasText:t.name}).first().dblclick();
   await page.locator('#btnBake').click();
   // Fail promptly and meaningfully if a recipe reports an error. Do not confuse
   // a previous output with the result of this run.
   await page.waitForFunction(() => {
     const done = document.querySelector('#progress')?.hidden;
     const status = document.querySelector('#statusText')?.textContent?.trim();
     return done && (status === 'Ready' || /^Error/.test(status || ''));
   }, null, { timeout: 15000 });
   const status = (await page.locator('#statusText').textContent())?.trim();
   const banner = (await page.locator('#banner').textContent())?.trim();
   assert.equal(status, 'Ready', `${t.name}: recipe failed: ${banner || status}`);
   const outputText = await page.locator('#output').inputValue();
   let report;
   try { report = JSON.parse(outputText); }
   catch (e) { throw new Error(`${t.name}: expected JSON evidence output; got ${outputText.slice(0, 350)}`, { cause: e }); }
   assert.ok(report !== null && typeof report === 'object', t.name + ' expected a JSON object or array');
   if(t.expect)for(const[k,v]of Object.entries(t.expect))assert.equal(report[k],v,`${t.name} / ${k}`);
   if(t.check)assert.ok(t.check(report),t.name+' expected evidence not found');
   assert.deepEqual(jsErrors,[],t.name+' JavaScript errors');
   console.log('PASS: Chromium native file upload → operation → recipe → decoded output: '+t.name);
  }finally{await context.close();}
 }
 console.log('PASS: '+cases.length+' native artifact workflow integrations in Chromium.');
}finally{await browser?.close();if(server)await new Promise(resolve=>server.close(resolve));}
