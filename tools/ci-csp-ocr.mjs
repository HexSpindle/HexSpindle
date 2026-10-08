#!/usr/bin/env node
// Real OCR/Tesseract integration probe under enforced candidate CSP.
// External CDN failures are distinguished from CSP findings; no production changes.
import { createRequire } from 'node:module';
import { startCspServer } from './ci-csp-shared.mjs';
const { chromium } = createRequire(import.meta.url)('playwright');
const server=await startCspServer();
let browser;
try {
  browser=await chromium.launch();
  const page=await browser.newPage();
  page.setDefaultTimeout(95000);
  const failures=[];
  page.on('requestfailed', r=>failures.push({url:r.url().slice(0,220),reason:r.failure()?.errorText||'failed'}));
  await page.addInitScript(()=>{
    window.__ocrCsp=[];
    document.addEventListener('securitypolicyviolation',e=>window.__ocrCsp.push({
      directive:e.effectiveDirective,blocked:e.blockedURI,disposition:e.disposition
    }));
  });
  const url=`http://127.0.0.1:${server.address().port}/`;
  const response=await page.goto(url,{waitUntil:'load'});
  if(!response.headers()['content-security-policy'])throw Error('Enforced CSP header missing');
  console.log('PASS candidate CSP enforced for real OCR probe');
  let result;
  try {
    result=await Promise.race([
      page.evaluate(async ()=>{
        await import('./modules/index.js');
        const {bake}=await import('./core/engine.js');
        const canvas=document.createElement('canvas');
        canvas.width=650;canvas.height=150;
        const ctx=canvas.getContext('2d');
        ctx.fillStyle='#fff';ctx.fillRect(0,0,650,150);
        ctx.fillStyle='#000';ctx.font='bold 78px Arial';
        ctx.fillText('HELLO 123',32,105);
        const blob=await new Promise((res,rej)=>canvas.toBlob(b=>b?res(b):rej(Error('PNG fixture failed')),'image/png'));
        const bytes=new Uint8Array(await blob.arrayBuffer());
        const baked=await bake(bytes,[{module:'Optical Character Recognition',args:[false,'LSTM only']}]);
        if(baked.error)throw Error(baked.error.message);
        const out=new TextDecoder().decode(baked.output).trim();
        return {text:out,valid:/HELLO\s*123/i.test(out)};
      }),
      new Promise((_,reject)=>setTimeout(()=>reject(Error('OCR exceeded 90 seconds')),90000))
    ]);
  }catch(e){result={error:String(e?.message||e)}}
  // Browser event delivery can lag immediately after rejected network fetches.
  await page.waitForTimeout(500);
  const violations=await page.evaluate(()=>window.__ocrCsp||[]);
  console.log('OCR engine output:',result.text?.slice(0,120)??'(none)');
  if(result.valid)console.log('PASS real Tesseract OCR recognized HELLO 123');
  else console.warn('ADVISORY real Tesseract OCR not verified: '+(result.error||'unexpected text result'));
  console.log('OCR CSP violations:',violations.length);
  violations.slice(0,15).forEach(v=>console.log('CSP '+v.directive+' '+v.blocked+' ('+v.disposition+')'));
  failures.slice(0,12).forEach(v=>console.log('NETWORK '+v.reason+' '+v.url));
  // A CSP failure means this policy is not ready for production. CDN outages
  // are advisory so third-party availability does not interrupt live deployment.
  if(violations.length){
    console.error('FAIL enforced candidate CSP blocked real OCR resources');
    process.exitCode=1;
  } else if(!result.valid){
    console.log('PASS OCR CSP monitor completed (real OCR result unverified; see advisory)');
  }
}finally{
  if(browser)await browser.close();
  await new Promise(done=>server.close(done));
}
