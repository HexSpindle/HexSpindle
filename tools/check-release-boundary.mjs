#!/usr/bin/env node
// Patch 21 — confirm the exact production allowlist can be shipped without
// CI utilities or common development/secret artifacts leaking into the site.
// Read-only check; does not modify the repository or production files.
import { readdirSync, statSync, existsSync, readFileSync } from 'node:fs';
import { join, resolve, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
const root=resolve(fileURLToPath(new URL('..',import.meta.url)));
const files=['index.html','app.js','app.css','LICENSE','THIRD_PARTY_NOTICES.md',
 'robots.txt','sitemap.xml','.nojekyll','google8833fe62b3f6acca.html'];
const dirs=['assets','core','modules','licenses'];
const errors=[],notes=[];
const fail=x=>errors.push(x);
for(const f of files) if(!existsSync(join(root,f))||!statSync(join(root,f)).isFile()) fail(`Missing release file: ${f}`);
for(const d of dirs) if(!existsSync(join(root,d))||!statSync(join(root,d)).isDirectory()) fail(`Missing release directory: ${d}`);
const badName=/(?:^|\/)(?:node_modules|tools|\.github|\.git|__pycache__)(?:\/|$)|(?:^|\/)\.env(?:\.[^/]+)?$|(?:^|\/)id_(?:rsa|ed25519)$|\.(?:pem|key|p12|pfx|zip|bak|orig|log|map|patch|pyc)$/i;
let count=0,total=0;
function inspect(file) {
 const rel=relative(root,file).replaceAll('\\','/');
 count++;total+=statSync(file).size;
 if(badName.test(rel)) fail(`Development/sensitive file would deploy: ${rel}`);
}
function walk(dir){
 for(const entry of readdirSync(dir,{withFileTypes:true})){
  const f=join(dir,entry.name);
  if(entry.isSymbolicLink()){ fail(`Symlink in deploy allowlist: ${relative(root,f)}`);continue; }
  if(entry.isDirectory()) walk(f);
  else if(entry.isFile()) inspect(f);
 }
}
for(const f of files) if(existsSync(join(root,f))&&statSync(join(root,f)).isFile()) inspect(join(root,f));
for(const d of dirs) if(existsSync(join(root,d))&&statSync(join(root,d)).isDirectory()) walk(join(root,d));
const wf=readFileSync(join(root,'.github/workflows/hexspindle-ci.yml'),'utf8');
const expectedFiles=`for file in ${files.join(' ')}; do`;
const expectedDirs=`for directory in ${dirs.join(' ')}; do`;
if(!wf.includes(expectedFiles)) fail('Workflow root allowlist has changed: review deployed filenames and update check intentionally');
if(!wf.includes(expectedDirs)) fail('Workflow directory allowlist has changed: review what becomes public');
if(!/rsync -av --delete --exclude='\.git\/' release\/ site\//.test(wf))
 fail('Release synchronization no longer matches validated allowlist');
const html=readFileSync(join(root,'index.html'),'utf8');
if(/http-equiv\s*=\s*["']Content-Security-Policy["']/i.test(html))
 notes.push('Production meta CSP is active: re-run real OCR and external API compatibility checks');
else notes.push('Production CSP not enforced; CI-only CSP tests do not secure deployed clients');
notes.push('OCR/Tesseract CDN language-data download and real AI provider CORS are not proven by mocked CI tests');
console.log(`Release boundary: ${count} allowlisted files, ${(total/1048576).toFixed(2)} MiB on disk`);
for(const n of notes)console.log('NOTE '+n);
for(const e of errors)console.error('FAIL '+e);
console.log(errors.length?`FAIL release boundary: ${errors.length} issue(s)`:'PASS production release boundary');
if(errors.length)process.exitCode=1;
