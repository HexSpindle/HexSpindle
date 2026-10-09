#!/usr/bin/env node
// Combined production release-boundary and security-posture checks.
// CI-only: does not mutate source files or deploy artifacts.
import { readdirSync, statSync, existsSync, readFileSync } from 'node:fs';
import { join, resolve, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(fileURLToPath(new URL('..', import.meta.url)));
const files = ['index.html','app.js','app.css','LICENSE','THIRD_PARTY_NOTICES.md','DATA_SOURCE_NOTICES.md',
  'robots.txt','sitemap.xml','.nojekyll','google8833fe62b3f6acca.html'];
const dirs = ['assets','core','modules','licenses'];
const errors = [], notes = [];
const fail = message => errors.push(message);
const path = part => join(root, part);

for (const f of files) {
  if (!existsSync(path(f)) || !statSync(path(f)).isFile()) fail(`Missing release file: ${f}`);
}
for (const d of dirs) {
  if (!existsSync(path(d)) || !statSync(path(d)).isDirectory()) fail(`Missing release directory: ${d}`);
}
const badName = /(?:^|\/)(?:node_modules|tools|\.github|\.git|__pycache__)(?:\/|$)|(?:^|\/)\.env(?:\.[^/]+)?$|(?:^|\/)id_(?:rsa|ed25519)$|\.(?:pem|key|p12|pfx|zip|bak|orig|log|map|patch|pyc)$/i;
let count = 0, total = 0;
function inspect(file) {
  const rel = relative(root,file).replaceAll('\\','/');
  count++; total += statSync(file).size;
  if (badName.test(rel)) fail(`Development/sensitive file would deploy: ${rel}`);
}
function walkRelease(dir) {
  for (const entry of readdirSync(dir,{withFileTypes:true})) {
    const file = join(dir,entry.name);
    if (entry.isSymbolicLink()) { fail(`Symlink in deploy allowlist: ${relative(root,file)}`); continue; }
    if (entry.isDirectory()) walkRelease(file);
    else if (entry.isFile()) inspect(file);
  }
}
for (const f of files) if (existsSync(path(f)) && statSync(path(f)).isFile()) inspect(path(f));
for (const d of dirs) if (existsSync(path(d)) && statSync(path(d)).isDirectory()) walkRelease(path(d));

const workflow = readFileSync(path('.github/workflows/hexspindle-ci.yml'),'utf8');
const html = readFileSync(path('index.html'),'utf8');
const required = [
  [workflow.includes(`for file in ${files.join(' ')}; do`), 'Workflow root allowlist has changed: review deployed filenames'],
  [workflow.includes(`for directory in ${dirs.join(' ')}; do`), 'Workflow directory allowlist has changed: review deployed directories'],
  [/rsync -av --delete --exclude='\.git\/' --exclude='\.github\/' --exclude='tools\/' release\/ site\//.test(workflow), 'Release synchronization no longer matches validated allowlist'],
  [/^permissions:\s*\n\s*contents: read\s*$/m.test(workflow), 'Workflow must retain read-only GITHUB_TOKEN permissions'],
  [/if:\s*github\.event_name == 'push' && github\.ref == 'refs\/heads\/main'/.test(workflow), 'Deploy job must be restricted to pushes on main'],
  [/needs:\s*browser-smoke-test/.test(workflow), 'Deploy must depend on passed smoke tests'],
  [/persist-credentials:\s*false/.test(workflow), 'Checkout should not retain GitHub token'],
  [/ssh-key:\s*\$\{\{ secrets\.PAGES_DEPLOY_KEY \}\}/.test(workflow), 'Deployment should use dedicated SSH deploy key']
];
for (const [ok,message] of required) if (!ok) fail(message);

// Preserve the repository-wide credential filename scan from check-security-posture.mjs.
const forbiddenNames = /^(?:\.env(?:\..+)?|id_(?:rsa|ed25519)|.*\.(?:pem|p12|pfx|key)|.*credentials.*\.json|.*secrets?.*\.json)$/i;
const skip = new Set(['.git','node_modules','.next','dist','build','coverage']);
function walkSecrets(dir) {
  for (const item of readdirSync(dir,{withFileTypes:true})) {
    if (item.isDirectory()) {
      if (!skip.has(item.name)) walkSecrets(join(dir,item.name));
    } else if (item.isFile() && forbiddenNames.test(item.name)) {
      fail(`Potential credential material under tracked source: ${relative(root,join(dir,item.name))}`);
    }
  }
}
walkSecrets(root);

// Preserve the original new-tab opener-protection check.
for (const m of html.matchAll(/<a\b[^>]*>/gi)) {
  const anchor=m[0];
  if (!/\btarget\s*=\s*['"]_blank['"]/i.test(anchor)) continue;
  const rel=anchor.match(/\brel\s*=\s*['"]([^'"]*)['"]/i)?.[1] || '';
  if (!/\bnoopener\b/i.test(rel)) fail(`New-tab link is missing rel=noopener: ${anchor.slice(0,140)}`);
}
if (!/<script\s+type=["']module["']\s+src=["']app\.js["']/.test(html)) {
  notes.push('App script tag has changed; review browser entrypoint.');
}
if (/http-equiv\s*=\s*["']Content-Security-Policy["']/i.test(html)) {
  notes.push('Production meta CSP is active: re-run real OCR and external API compatibility checks');
} else {
  notes.push('Production CSP not enforced; CI-only CSP tests do not secure deployed clients');
}
notes.push('OCR/Tesseract CDN language-data download and real AI provider CORS are not proven by mocked CI tests');
console.log(`Release boundary: ${count} allowlisted files, ${(total/1048576).toFixed(2)} MiB on disk`);
for (const note of notes) console.log('NOTE '+note);
for (const error of errors) console.error('FAIL '+error);
console.log(errors.length ? `FAIL combined security and release boundary: ${errors.length} issue(s)` :
  'PASS combined security posture and production release boundary');
if (errors.length) process.exitCode=1;
