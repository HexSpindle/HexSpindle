#!/usr/bin/env node
// SPDX-License-Identifier: MIT
// Browser test of the BUILT site (tools/build-site.mjs output), i.e. the files that are actually deployed.
// The other browser tests import source modules by path, which the bundled site no longer serves, so this
// test drives the real page instead: recipes are loaded through share links and results are read from the UI.
//
//   node ci-dist-smoke.mjs [--dist <dir>]     (builds into a temporary directory when --dist is omitted)
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { readFileSync, mkdtempSync, rmSync, existsSync } from 'node:fs';
import { resolve, join, extname, sep } from 'node:path';
import { tmpdir } from 'node:os';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';
import { buildSite, BUNDLE, ENTRY, NOTICES, BUILD_INFO } from './build-site.mjs';
import { POLICY } from './ci-csp-shared.mjs';

const { chromium } = createRequire(import.meta.url)('playwright');
const HERE = resolve(fileURLToPath(new URL('.', import.meta.url)));
const MIME = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.mjs': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8', '.png': 'image/png', '.txt': 'text/plain; charset=utf-8', '.md': 'text/markdown; charset=utf-8' };

const arg = process.argv.indexOf('--dist');
let dist = arg > 0 && process.argv[arg + 1] ? resolve(process.argv[arg + 1]) : null, temporary = null;
if (!dist) { temporary = mkdtempSync(join(tmpdir(), 'hexspindle-dist-')); dist = join(temporary, 'site'); await buildSite(dist); }
if (!existsSync(join(dist, BUNDLE))) throw new Error(`${dist} does not contain ${BUNDLE}; run build-site.mjs first`);

const failures = [];
let passed = 0;
const check = (ok, label, detail = '') => { if (ok) { passed++; console.log(`PASS ${label}`); } else { failures.push(label); console.error(`FAIL ${label}${detail ? ': ' + detail : ''}`); } };

// Static server for the built site. It also records every request, and stands in for the feed manifest that the
// separate feed-sync workflow publishes at data/feeds/ (which is not part of this build).
const requests = [];
let csp = false;
const server = createServer(async (req, res) => {
  const pathname = decodeURIComponent(new URL(req.url, 'http://localhost').pathname);
  try {
    if (pathname === '/data/feeds/manifest.json') {
      requests.push({ path: pathname, status: 200 });
      res.writeHead(200, { 'Content-Type': MIME['.json'] }).end(JSON.stringify({ schema_version: 1, generated_at: '2026-01-01T00:00:00Z', datasets: {} }));
      return;
    }
    const full = resolve(dist, '.' + (pathname === '/' ? '/index.html' : pathname));
    if (!full.startsWith(dist + sep)) { res.writeHead(403).end(); return; }
    const bytes = await readFile(full);
    const headers = { 'Content-Type': MIME[extname(full)] || 'application/octet-stream' };
    if (csp && pathname === '/') headers['Content-Security-Policy'] = POLICY;
    requests.push({ path: pathname, status: 200 });
    res.writeHead(200, headers).end(bytes);
  } catch { requests.push({ path: pathname, status: 404 }); res.writeHead(404).end('Not found'); }
});
await new Promise(done => server.listen(0, '127.0.0.1', done));
const origin = `http://127.0.0.1:${server.address().port}`;

const b64url = bytes => Buffer.from(bytes).toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
// Same format as the app's own "share link": #r=<recipe>&i=<input>.
const shareLink = (recipe, input) => {
  const r = b64url(Buffer.from(JSON.stringify(recipe.map(o => [o.module, o.args || [], 0, 0, 0])), 'utf8'));
  const bytes = Buffer.from(input ?? '', 'utf8');
  return `${origin}/#r=${r}${bytes.length ? '&i=' + b64url(bytes) : ''}`;
};

const browser = await chromium.launch();
try {
  const context = await browser.newContext();
  const open = async (url, { ready = true } = {}) => {
    const page = await context.newPage();
    const errors = [];
    page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
    page.on('pageerror', e => errors.push(String(e)));
    await page.goto(url, { waitUntil: 'load' });
    if (ready) await page.waitForFunction(() => document.getElementById('statusText')?.textContent === 'Ready', null, { timeout: 30000 });
    return { page, errors };
  };
  // The exact output bytes as text. The text view shows control characters as symbols and hides binary output
  // behind a preview, so the Base64 view is read instead and decoded here.
  const exactOutput = `(() => {
    const view = document.getElementById('outView');
    if (view.value !== 'base64') { view.value = 'base64'; view.dispatchEvent(new Event('change', { bubbles: true })); }
    try { return new TextDecoder().decode(Uint8Array.from(atob(document.getElementById('output').value), c => c.charCodeAt(0))); } catch { return null; }
  })()`;
  // Waits for the output pane to show the expected text, or returns what it showed instead.
  const outputOf = async (page, matches, timeout = 20000) => {
    try { await page.waitForFunction(matches, null, { timeout }); return { ok: true }; }
    catch { return { ok: false, got: await page.evaluate(() => ({ output: document.getElementById('output').value.slice(0, 200), banner: document.getElementById('banner').hidden ? '' : document.getElementById('banner').textContent })) }; }
  };

  // 1. Startup: the page becomes ready from the bundle alone.
  requests.length = 0;
  const first = await open(origin + '/');
  const startup = requests.slice();
  const scripts = startup.filter(r => /\.m?js$/.test(r.path));
  check(first.errors.length === 0, 'No console errors at startup', first.errors.join(' | '));
  check(startup.every(r => r.status === 200), 'No missing files at startup', startup.filter(r => r.status !== 200).map(r => r.path).join(', '));
  check(scripts.some(r => r.path === '/' + BUNDLE) && !scripts.some(r => r.path === '/' + ENTRY), `Page boots from ${BUNDLE}`);
  check(!startup.some(r => /^\/(?:core|modules)\//.test(r.path)), 'No unbundled core/ or modules/ file is requested at startup', startup.filter(r => /^\/(?:core|modules)\//.test(r.path)).map(r => r.path).join(', '));
  check(scripts.length <= 6, `Startup needs ${scripts.length} script requests (limit 6)`, scripts.map(r => r.path).join(', '));
  const opCount = await first.page.evaluate(() => { const m = /(\d+)\s*ops/.exec(document.body.textContent); return m ? +m[1] : 0; });
  check(opCount >= 700, `Operation list is populated (${opCount} operations)`);
  await first.page.close();

  // 2. The regression recipes, executed by the bundled application itself.
  const recipes = JSON.parse(readFileSync(join(HERE, 'ci-recipes.json'), 'utf8'));
  let recipeFailures = 0;
  for (const [i, t] of recipes.entries()) {
    const { page, errors } = await open(shareLink(t.recipe, t.input));
    const result = t.shapeOnly
      ? await outputOf(page, `new RegExp(${JSON.stringify(t.shapeOnly)}).test(${exactOutput})`)
      : await outputOf(page, `${exactOutput} === ${JSON.stringify(t.expect)}`);
    if (!result.ok || errors.length) { recipeFailures++; console.error(`FAIL recipe [${i}] ${t.label}: ${result.ok ? 'console errors: ' + errors.join(' | ') : `expected ${JSON.stringify(t.shapeOnly || t.expect)}, got ${JSON.stringify(result.got)}`}`); }
    await page.close();
  }
  check(recipeFailures === 0, `${recipes.length - recipeFailures}/${recipes.length} regression recipes produce the expected output in the built site`);

  // 3. A library that is copied verbatim and loaded on demand.
  requests.length = 0;
  let run = await open(shareLink([{ module: 'Brotli Compress' }, { module: 'Brotli Decompress' }], 'bundle check: lazy library round trip'));
  let result = await outputOf(run.page, `document.getElementById('output').value === 'bundle check: lazy library round trip'`);
  check(result.ok && requests.some(r => r.path === '/modules/compression/_brotli.js' && r.status === 200), 'Lazy library (Brotli) loads from its original path and works', JSON.stringify(result.got || requests.filter(r => r.status !== 200)));
  await run.page.close();

  // 4. A lazily loaded module that shares code with the bundle (emitted as a chunk): CyberChef-compatible Magic.
  requests.length = 0;
  run = await open(shareLink([{ module: 'Magic', args: [3, false, '', 8, false, 'Options (JSON)'] }], 'aGVsbG8gd29ybGQgZnJvbSBoZXhzcGluZGxl'));
  result = await outputOf(run.page, `document.getElementById('output').value.includes('"From Base64"')`);
  check(result.ok && requests.some(r => /^\/HexSpindle\._magic_lib-[A-Z0-9]+\.js$/.test(r.path) && r.status === 200), 'Chunked lazy module (Magic option list) loads and shares the operation registry', JSON.stringify(result.got || ''));
  await run.page.close();

  // 5. Magic's graphical output and its "Add to recipe" button.
  run = await open(shareLink([{ module: 'Magic' }], '483473494141414141414141437174574b69314f4c564b79556b704d7963334d55394a524b737250535657795569704b5455784a4c564b714251417a2f7157524941414141413d3d'));
  await run.page.waitForFunction(() => document.querySelector('iframe.render')?.srcdoc.includes('mg-bar') && !document.getElementById('magicBar')?.hidden, null, { timeout: 20000 }).catch(() => {});
  const bar = await run.page.evaluate(() => ({ frame: !!document.querySelector('iframe.render')?.srcdoc.includes('mg-bar'), button: document.querySelector('#magicBar button')?.textContent || '' }));
  check(bar.frame && /Add to recipe: From Hex → From Base64 → Gunzip/.test(bar.button), 'Magic renders graphically and offers the very likely recipe', JSON.stringify(bar));
  if (bar.button) await run.page.click('#magicBar button');
  result = await outputOf(run.page, `document.getElementById('output').value === '{"user":"admin","role":"reader"}'`);
  check(result.ok, 'Add to recipe replaces the Magic step with the decoding operations', JSON.stringify(result.got || ''));
  check(run.errors.length === 0, 'No console errors while using Magic', run.errors.join(' | '));
  await run.page.close();

  // 6. Same-origin feed data is still resolved from the site root, although the module now lives inside the bundle.
  requests.length = 0;
  run = await open(shareLink([{ module: 'SANS ISC IP' }], '8.8.8.8'), { ready: false });
  for (let waited = 0; waited < 15000 && !requests.some(r => r.path.includes('manifest.json')); waited += 250) await run.page.waitForTimeout(250);
  const feed = requests.filter(r => r.path.includes('manifest.json'));
  check(feed.length > 0 && feed.every(r => r.path === '/data/feeds/manifest.json'), 'Feed manifest is requested from /data/feeds/manifest.json', JSON.stringify(requests.filter(r => r.path.includes('feeds')).slice(0, 5)));
  await run.page.close();

  // 7. Generated files.
  check(readFileSync(join(dist, ENTRY), 'utf8').trim() === `import './${BUNDLE}';`, `${ENTRY} is a forwarding shim for pages cached before the bundle existed`);
  check(/Licence texts:/.test(readFileSync(join(dist, NOTICES), 'utf8')), `${NOTICES} lists the bundled third-party code`);
  const info = JSON.parse(readFileSync(join(dist, BUILD_INFO), 'utf8'));
  check(info.entry === BUNDLE && !info.incomplete && Array.isArray(info.files) && info.files.length > 20, `${BUILD_INFO} describes a complete build`);

  // 8. The candidate Content-Security-Policy used by the CSP tests does not block the bundled layout.
  csp = true;
  const guarded = await context.newPage();
  await guarded.addInitScript(() => { window.__csp = []; document.addEventListener('securitypolicyviolation', e => window.__csp.push(`${e.violatedDirective} ${e.blockedURI}`)); });
  const nav = await guarded.goto(shareLink([{ module: 'To Base64' }], 'HexSpindle'), { waitUntil: 'load' });
  result = await outputOf(guarded, `document.getElementById('output').value === 'SGV4U3BpbmRsZQ=='`);
  const violations = await guarded.evaluate(() => window.__csp);
  check(!!nav.headers()['content-security-policy'] && result.ok && violations.length === 0, 'Built site runs under the enforced candidate CSP', JSON.stringify({ result: result.got, violations }));
  await guarded.close();
} finally {
  await browser.close();
  await new Promise(done => server.close(done));
  if (temporary) rmSync(temporary, { recursive: true, force: true });
}
console.log(`Built-site checks: ${passed}/${passed + failures.length} passed`);
if (failures.length) process.exitCode = 1;
