#!/usr/bin/env node
// Combined production release-boundary and security-posture checks.
// CI-only: does not mutate source files or deploy artifacts.
//
//   node check-release-boundary.mjs                 checks the source tree and the workflow
//   node check-release-boundary.mjs --dist <dir>    additionally checks a site built by build-site.mjs
import { readdirSync, statSync, existsSync, readFileSync } from 'node:fs';
import { join, resolve, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(fileURLToPath(new URL('..', import.meta.url)));
// Source files and directories the deployed site is built from.
const files = ['index.html','app.js','app.css','LICENSE','THIRD_PARTY_NOTICES.md','DATA_SOURCE_NOTICES.md',
  'robots.txt','sitemap.xml','.nojekyll','google8833fe62b3f6acca.html'];
const dirs = ['assets','core','modules','licenses','analytics'];
// What build-site.mjs copies unchanged; index.html and app.js are generated, core/ and modules/ are bundled.
const copiedFiles = files.filter(f => f !== 'index.html' && f !== 'app.js');
const copiedDirs = dirs.filter(d => d !== 'core' && d !== 'modules');
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
function inspect(file, base = root) {
  const rel = relative(base,file).replaceAll('\\','/');
  count++; total += statSync(file).size;
  if (badName.test(rel)) fail(`Development/sensitive file would deploy: ${rel}`);
  return rel;
}
function walkRelease(dir, base = root, found = []) {
  for (const entry of readdirSync(dir,{withFileTypes:true})) {
    const file = join(dir,entry.name);
    if (entry.isSymbolicLink()) { fail(`Symlink in deploy allowlist: ${relative(base,file)}`); continue; }
    if (entry.isDirectory()) walkRelease(file, base, found);
    else if (entry.isFile()) found.push(inspect(file, base));
  }
  return found;
}
for (const f of files) if (existsSync(path(f)) && statSync(path(f)).isFile()) inspect(path(f));
for (const d of dirs) if (existsSync(path(d)) && statSync(path(d)).isDirectory()) walkRelease(path(d));

const workflow = readFileSync(path('.github/workflows/hexspindle-ci.yml'),'utf8');
const html = readFileSync(path('index.html'),'utf8');
const buildScript = readFileSync(path('tools/build-site.mjs'),'utf8');
// The build script is read as text so this check keeps working before dependencies are installed.
const declared = name => {
  const m = new RegExp(`export const ${name} = \\[([^\\]]*)\\]`).exec(buildScript);
  return m ? [...m[1].matchAll(/'([^']+)'/g)].map(x => x[1]).sort().join(' ') : null;
};
const required = [
  [declared('RELEASE_FILES') === [...copiedFiles].sort().join(' '), 'Build script root allowlist has changed: review deployed filenames'],
  [declared('RELEASE_DIRS') === [...copiedDirs].sort().join(' '), 'Build script directory allowlist has changed: review deployed directories'],
  [/node build-site\.mjs --out "\$GITHUB_WORKSPACE\/release"/.test(workflow), 'Deploy job must build the site with build-site.mjs into release/'],
  [/node check-release-boundary\.mjs --dist "\$GITHUB_WORKSPACE\/release"/.test(workflow), 'Deploy job must validate the built release boundary'],
  [/node ci-dist-smoke\.mjs --dist \.\.\/dist/.test(workflow), 'The built site must be browser-tested before deployment'],
  [/TESTED_SHA256: \$\{\{ needs\.browser-smoke-test\.outputs\.bundle_sha256 \}\}/.test(workflow) && /"\$built" != "\$TESTED_SHA256"/.test(workflow), 'Deploy job must verify it deploys the bundle that was tested'],
  [/rsync -av --delete --exclude='\.git\/' --exclude='\.github\/' --exclude='tools\/' release\/ site\//.test(workflow), 'Release synchronization no longer matches validated allowlist'],
  [/^permissions:\s*\n\s*contents: read\s*$/m.test(workflow), 'Workflow must retain read-only GITHUB_TOKEN permissions'],
  [/if:\s*github\.event_name == 'push' && github\.ref == 'refs\/heads\/main'/.test(workflow), 'Deploy job must be restricted to pushes on main'],
  [/needs:\s*browser-smoke-test/.test(workflow), 'Deploy must depend on passed smoke tests'],
  [/persist-credentials:\s*false/.test(workflow), 'Checkout should not retain GitHub token'],
  [/ssh-key:\s*\$\{\{ secrets\.PAGES_DEPLOY_KEY \}\}/.test(workflow), 'Deployment should use dedicated SSH deploy key']
];
for (const [ok,message] of required) if (!ok) fail(message);

// A built site may only contain what the build is meant to produce.
const distArg = process.argv.indexOf('--dist');
if (distArg > 0) {
  const dist = resolve(process.argv[distArg + 1] || '');
  if (!process.argv[distArg + 1] || !existsSync(dist) || !statSync(dist).isDirectory()) fail(`Built site directory not found: ${process.argv[distArg + 1] || '(none given)'}`);
  else {
    const before = count;
    const built = walkRelease(dist, dist);
    const generated = ['index.html', 'app.js', 'HexSpindle.js', 'HexSpindle.LICENSES.txt', 'build-info.json'];
    const allowed = rel => copiedFiles.includes(rel) || generated.includes(rel) || copiedDirs.some(d => rel.startsWith(d + '/'))
      || /^HexSpindle\.[\w-]+\.js$/.test(rel)                // bundler chunks
      || /^modules\/[a-z_]+\/_[\w.-]+\.m?js$/.test(rel);     // lazily loaded libraries, copied verbatim
    for (const rel of built) if (!allowed(rel)) fail(`Unexpected file in built site: ${rel}`);
    for (const rel of [...copiedFiles, ...generated]) if (!built.includes(rel)) fail(`Built site is missing ${rel}`);
    for (const rel of built.filter(r => r.startsWith('modules/'))) {
      if (!existsSync(path(rel)) || !readFileSync(path(rel)).equals(readFileSync(join(dist, rel)))) fail(`Built ${rel} is not an exact copy of the source file`);
    }
    const builtHtml = existsSync(join(dist, 'index.html')) ? readFileSync(join(dist, 'index.html'), 'utf8') : '';
    if (!/<script\s+type=["']module["']\s+src=["']HexSpindle\.js["']\s*><\/script>/.test(builtHtml)) fail('Built index.html does not start the application from HexSpindle.js');
    if (/<script(?![^>]*\bsrc=)[^>]*>/i.test(builtHtml)) fail('Built index.html contains an inline script');
    if (existsSync(join(dist, 'build-info.json')) && JSON.parse(readFileSync(join(dist, 'build-info.json'), 'utf8')).incomplete) fail('Built site is marked incomplete (the build did not finish)');
    console.log(`Built site: ${count - before} files checked in ${dist}`);
  }
}

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
