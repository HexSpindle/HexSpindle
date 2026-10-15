#!/usr/bin/env node
// SPDX-License-Identifier: MIT
// Tests a built HexSpindle portable launcher (desktop/) as users run it: the real executable, on this machine.
//
//   node ci-desktop-launcher.mjs --bin <launcher> --dist <built site> [--site <folder>] [--browser] [--expect-version X]
//
// --dist is the tested site build the launcher was made from (or, with --site, the folder it serves); every file
// that build-info.json lists must be served byte for byte. With --site, the launcher serves that folder instead of
// its built-in copy; a source folder has no build-info.json, so only index.html and a few known files are compared.
// --browser also drives the app in Chromium (Playwright): startup, the regression recipes, lazily loaded
// libraries, feed data through the launcher, analytics, saved data across restarts and the automatic exit.
// Nothing is sent to the real analytics collector or feed site: both are replaced by local stand-ins.
import { spawn, execFile } from 'node:child_process';
import { createServer, request as httpRequest } from 'node:http';
import { createHash } from 'node:crypto';
import { gunzipSync } from 'node:zlib';
import { readFileSync, existsSync, mkdtempSync, rmSync } from 'node:fs';
import { resolve, join } from 'node:path';
import { tmpdir } from 'node:os';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';

const HERE = resolve(fileURLToPath(new URL('.', import.meta.url)));
const argv = process.argv.slice(2);
const option = name => { const i = argv.indexOf(name); return i >= 0 && argv[i + 1] ? argv[i + 1] : null; };
const bin = option('--bin') && resolve(option('--bin'));
const dist = option('--dist') && resolve(option('--dist'));
const site = option('--site') && resolve(option('--site'));
const expectVersion = option('--expect-version');
const useBrowser = argv.includes('--browser');
if (!bin || !dist) {
  console.error('usage: node ci-desktop-launcher.mjs --bin <launcher> --dist <built site> [--site <folder>] [--browser] [--expect-version X]');
  process.exit(2);
}
const buildInfoPath = join(dist, 'build-info.json');
const buildInfo = existsSync(buildInfoPath) ? JSON.parse(readFileSync(buildInfoPath, 'utf8')) : null;

const failures = [];
let passed = 0;
const check = (ok, label, detail = '') => { if (ok) { passed++; console.log(`PASS ${label}`); } else { failures.push(label); console.error(`FAIL ${label}${detail ? ': ' + detail : ''}`); } };
const sha256 = bytes => createHash('sha256').update(bytes).digest('hex');
const sleep = ms => new Promise(done => setTimeout(done, ms));
const ANALYTICS_META = /<meta\b[^>]*\bname=["']hexspindle-analytics-endpoint["'][^>]*>/i;
const LAUNCHER_META = '<meta name="hexspindle-launcher" content="1">';
const SESSION_TAG = '<script src="/__hexspindle/session.js" defer></script>';

// Stand-in for the public site's feed files, so the feed proxy can be tested without the internet.
const FEED_MANIFEST = JSON.stringify({ schema_version: 1, generated_at: '2026-01-01T00:00:00Z', datasets: {} });
const feedRequests = [];
const feeds = createServer((req, res) => {
  feedRequests.push({ path: req.url, ua: req.headers['user-agent'] || '' });
  if (req.url === '/data/feeds/manifest.json') res.writeHead(200, { 'Content-Type': 'application/json' }).end(FEED_MANIFEST);
  else res.writeHead(404).end('no such feed');
});
await new Promise(done => feeds.listen(0, '127.0.0.1', done));
const feedsUpstream = `http://127.0.0.1:${feeds.address().port}`;

// A free port for the launcher (the default 47800 may be in use by a HexSpindle the developer is running).
const freePort = () => new Promise(done => { const s = createServer(); s.listen(0, '127.0.0.1', () => { const p = s.address().port; s.close(() => done(p)); }); });
const port = await freePort();
const origin = `http://127.0.0.1:${port}`;

const runOnce = args => new Promise(done => execFile(bin, args, { timeout: 30000, windowsHide: true }, (error, stdout, stderr) => done({ code: error ? (error.code ?? 1) : 0, stdout, stderr })));

// Starts the launcher and resolves once it prints its address.
function launch(extra = []) {
  const args = ['--no-browser', '--port', String(port), '--feeds-upstream', feedsUpstream, '--exit-grace', '2s', '--first-connect-timeout', '2m',
    ...(site ? ['--site', site] : []), ...extra];
  const child = spawn(bin, args, { stdio: ['ignore', 'pipe', 'pipe'], windowsHide: true });
  let output = '';
  const exited = new Promise(done => child.on('exit', (code, signal) => done({ code, signal })));
  const ready = new Promise((done, fail) => {
    const timer = setTimeout(() => fail(new Error(`launcher did not start within 30 s:\n${output}`)), 30000);
    const onData = chunk => { output += chunk; if (output.includes(`HexSpindle running at ${origin}/`)) { clearTimeout(timer); done(); } };
    child.stdout.on('data', onData);
    child.stderr.on('data', onData);
    exited.then(({ code }) => { clearTimeout(timer); fail(new Error(`launcher exited (${code}) before it was ready:\n${output}`)); });
  });
  return { child, ready, exited, output: () => output };
}

// Raw HTTP, so that request paths and headers reach the launcher exactly as written.
function get(path, { method = 'GET', headers = {}, host = `127.0.0.1:${port}` } = {}) {
  return new Promise((done, fail) => {
    const req = httpRequest({ host: '127.0.0.1', port, path, method, headers: { Host: host, ...headers }, agent: false }, res => {
      const chunks = [];
      res.on('data', c => chunks.push(c));
      res.on('end', () => done({ status: res.statusCode, headers: res.headers, body: Buffer.concat(chunks) }));
    });
    req.on('error', fail);
    req.end();
  });
}
const decoded = res => res.headers['content-encoding'] === 'gzip' ? gunzipSync(res.body) : res.body;

let launcher = null;
let context = null;
const work = mkdtempSync(join(tmpdir(), 'hexspindle-launcher-test-'));
try {
  // 1. Command-line information.
  const versionRun = await runOnce(['--version']);
  check(versionRun.code === 0 && /HexSpindle portable launcher \S+/.test(versionRun.stdout) && (!expectVersion || versionRun.stdout.includes(`launcher ${expectVersion}`)),
    `--version reports the version${expectVersion ? ' ' + expectVersion : ''}`, versionRun.stdout + versionRun.stderr);
  if (buildInfo && !site) {
    const bundle = buildInfo.files.find(f => f.path === 'HexSpindle.js')?.sha256 || '';
    check(versionRun.stdout.includes(`site bundle ${bundle.slice(0, 12)}`), '--version identifies the tested site bundle', versionRun.stdout);
  }
  const licenses = await runOnce(['--licenses']);
  check(licenses.code === 0 && licenses.stdout.includes('Copyright 2009 The Go Authors'), '--licenses prints the Go license');

  // 2. The site, as the launcher serves it.
  launcher = launch();
  await launcher.ready;
  check(true, `Launcher starts and listens on ${origin}`);
  const index = await get('/', { headers: { 'Accept-Encoding': 'gzip' } });
  const indexText = decoded(index).toString('utf8');
  const sourceIndex = readFileSync(join(dist, 'index.html'), 'utf8');
  check(index.status === 200 && index.headers['content-type'] === 'text/html; charset=utf-8', 'index.html is served as HTML');
  check(indexText.includes(LAUNCHER_META) && indexText.includes(SESSION_TAG), 'index.html carries the launcher marker and session script');
  check(indexText.replace(LAUNCHER_META + '\n', '').replace(SESSION_TAG + '\n', '') === sourceIndex, 'index.html is otherwise unchanged (analytics endpoint kept)');
  check(ANALYTICS_META.test(indexText) === ANALYTICS_META.test(sourceIndex), 'Usage analytics are on by default');

  const listed = buildInfo ? buildInfo.files.filter(f => f.path !== 'index.html' && !f.path.split('/').some(p => p.startsWith('.'))) : [];
  const known = listed.length ? listed : ['app.js', 'app.css', 'LICENSE', 'analytics/client.js'].map(path => ({ path, sha256: sha256(readFileSync(join(dist, path))) }));
  const mismatched = [];
  for (const [i, f] of known.entries()) {
    const res = await get('/' + f.path, { headers: i % 2 ? {} : { 'Accept-Encoding': 'gzip, deflate, br' } });
    if (res.status !== 200 || sha256(decoded(res)) !== f.sha256) mismatched.push(`${f.path} (${res.status})`);
  }
  check(mismatched.length === 0, `${known.length} site files are served byte for byte, with and without gzip`, mismatched.slice(0, 10).join(', '));

  const types = { 'app.js': 'text/javascript; charset=utf-8', 'app.css': 'text/css; charset=utf-8', LICENSE: 'text/plain; charset=utf-8' };
  const wasm = known.find(f => f.path.endsWith('.wasm'));
  if (wasm) types[wasm.path] = 'application/wasm';
  const mjs = known.find(f => f.path.endsWith('.mjs'));
  if (mjs) types[mjs.path] = 'text/javascript; charset=utf-8';
  const wrongTypes = [];
  for (const [path, type] of Object.entries(types)) {
    const res = await get('/' + path, { method: 'HEAD' });
    if (res.headers['content-type'] !== type) wrongTypes.push(`${path}: ${res.headers['content-type']}`);
  }
  check(wrongTypes.length === 0, 'Content types are fixed, whatever the operating system maps them to', wrongTypes.join(', '));
  check(index.headers['x-content-type-options'] === 'nosniff' && index.headers['cache-control'] === 'no-store' && index.headers['referrer-policy'] === 'no-referrer', 'Security and caching headers are set');

  // 3. Requests the launcher must refuse.
  check((await get('/', { host: 'attacker.example' })).status === 421, 'Requests for another host name are refused (DNS rebinding)');
  check((await get('/', { host: `127.0.0.1:${port + 1}` })).status === 421, 'Requests for another port are refused');
  check((await get('/', { host: `localhost:${port}` })).status === 200, 'localhost is accepted as well as 127.0.0.1');
  const refused = [];
  for (const path of ['/../LICENSE', '/modules/../LICENSE', '/%2e%2e/LICENSE', '/.nojekyll', '/index.html.gz', '/HexSpindle.js.gz', '/no-such-file.js', '/assets//x']) {
    const res = await get(path);
    if (res.status !== 404) refused.push(`${path}: ${res.status}`);
  }
  check(refused.length === 0, 'Traversal, hidden, internal and missing paths are not served', refused.join(', '));
  check((await get('/', { method: 'POST' })).status === 405 && (await get('/', { method: 'DELETE' })).status === 405, 'Only GET and HEAD reach the site');

  // 4. Launcher endpoints.
  const ping = await get('/__hexspindle/ping');
  const info = JSON.parse(ping.body.toString('utf8') || '{}');
  check(ping.status === 200 && info.app === 'hexspindle-launcher' && (!expectVersion || info.version === expectVersion), 'Ping identifies the launcher', ping.body.toString());
  const script = await get('/__hexspindle/session.js');
  check(script.status === 200 && script.headers['content-type'] === 'text/javascript; charset=utf-8' && script.body.toString().includes("url('heartbeat')"), 'Session script is served');
  check((await get('/__hexspindle/heartbeat?tab=test-tab-0001', { method: 'POST', headers: { 'Sec-Fetch-Site': 'cross-site' } })).status === 403, 'Other sites cannot send session heartbeats');
  check((await get('/__hexspindle/heartbeat?tab=bad', { method: 'POST' })).status === 400, 'Malformed tab IDs are refused');
  const lic = await get('/__hexspindle/licenses');
  check(lic.status === 200 && lic.body.toString().includes('The Go Authors'), 'License notices are served');

  // 5. Feed data comes from the upstream site, through the launcher.
  feedRequests.length = 0;
  const manifest = await get('/data/feeds/manifest.json');
  check(manifest.status === 200 && manifest.body.toString() === FEED_MANIFEST && feedRequests.some(r => r.path === '/data/feeds/manifest.json' && r.ua.startsWith('HexSpindle-Launcher/')),
    'Feed files are fetched from the upstream site', JSON.stringify(feedRequests));
  check((await get('/data/feeds/missing.json')).status === 404, 'Upstream status codes are passed on');
  check((await get('/data/feeds/../index.html')).status === 404 && (await get('/data/feeds/sub/dir.json')).status === 404, 'Feed paths cannot leave data/feeds/');

  // Tab sockets: only the launcher's own pages may hold one.
  const socketStatus = (origin_, tab) => new Promise((done, fail) => {
    const req = httpRequest({ host: '127.0.0.1', port, path: `/__hexspindle/socket?tab=${tab}`, agent: false,
      headers: { Host: `127.0.0.1:${port}`, Origin: origin_, Connection: 'Upgrade', Upgrade: 'websocket', 'Sec-WebSocket-Version': '13', 'Sec-WebSocket-Key': 'dGhlIHNhbXBsZSBub25jZQ==' } });
    req.on('upgrade', (res, socket) => { done({ status: res.statusCode, accept: res.headers['sec-websocket-accept'], socket }); });
    req.on('response', res => { res.resume(); done({ status: res.statusCode }); });
    req.on('error', fail);
    req.end();
  });
  check((await socketStatus('https://attacker.example', 'test-socket-0001')).status === 403, 'Other sites cannot open a tab socket');
  const sock = await socketStatus(origin, 'test-socket-0002');
  check(sock.status === 101 && sock.accept === 's3pPLMBiTxaQ9kYGzzhZRbK+xOo=', 'The launcher accepts a tab socket from its own pages');
  // This socket stands in for an open tab until the browser's first page holds its own; were it closed now, the
  // launcher would rightly stop after its grace period (2 s here) unless Chromium connected faster than that.
  const keeper = sock.socket;

  // 6. A second start reuses the running launcher instead of failing on the port.
  const second = await runOnce(['--no-browser', '--port', String(port), ...(site ? ['--site', site] : [])]);
  check(second.code === 0 && second.stdout.includes(`HexSpindle is already running at ${origin}/`), 'A second start reports the running launcher and exits', second.stdout + second.stderr);

  // 7. Browser tests.
  if (useBrowser) {
    const { chromium } = createRequire(import.meta.url)('playwright');
    const profile = join(work, 'profile');
    const collected = [];
    // The real collector is replaced by a stand-in that accepts the launcher origin, as the deployed collector must.
    const withStandIns = async context => {
      await context.route(/^https:\/\/[^/]+\.workers\.dev\//, route => {
        const request = route.request();
        collected.push({ url: request.url(), origin: request.headers().origin || '', body: request.postData() || '' });
        route.fulfill({ status: 204, headers: { 'Access-Control-Allow-Origin': request.headers().origin || '*' } });
      });
    };
    const open = async (context, url, { ready = true } = {}) => {
      const page = await context.newPage();
      const errors = [];
      page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
      page.on('pageerror', e => errors.push(String(e)));
      await page.goto(url, { waitUntil: 'load' });
      if (ready) await page.waitForFunction(() => document.getElementById('statusText')?.textContent === 'Ready', null, { timeout: 60000 });
      return { page, errors };
    };
    // Tabs are closed without running any page code (Playwright's default), like a browser that quits or
    // crashes: the launcher must notice from the tabs' sockets closing, not from a goodbye message.
    const closeTab = page => page.close();
    const closeTabs = context => context.close();
    const b64url = bytes => Buffer.from(bytes).toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
    const shareLink = (recipe, input) => {
      const r = b64url(Buffer.from(JSON.stringify(recipe.map(o => [o.module, o.args || [], 0, 0, 0])), 'utf8'));
      const bytes = Buffer.from(input ?? '', 'utf8');
      return `${origin}/#r=${r}${bytes.length ? '&i=' + b64url(bytes) : ''}`;
    };
    const exactOutput = `(() => {
      const view = document.getElementById('outView');
      if (view.value !== 'base64') { view.value = 'base64'; view.dispatchEvent(new Event('change', { bubbles: true })); }
      try { return new TextDecoder().decode(Uint8Array.from(atob(document.getElementById('output').value), c => c.charCodeAt(0))); } catch { return null; }
    })()`;
    const outputOf = async (page, matches, timeout = 30000) => {
      try { await page.waitForFunction(matches, null, { timeout }); return { ok: true }; }
      catch { return { ok: false, got: await page.evaluate(() => document.getElementById('output').value.slice(0, 200)) }; }
    };

    context = await chromium.launchPersistentContext(profile, { headless: true });
    await withStandIns(context);
    const first = await open(context, origin + '/');
    // The first page stays open for the whole run, as a user's tab would, while the checks below open and close
    // others; it now keeps the launcher running, so the stand-in socket can go.
    keeper?.destroy();
    check(first.errors.length === 0, 'App starts in the browser without console errors', first.errors.join(' | '));
    const opCount = await first.page.evaluate(() => { const m = /(\d+)\s*ops/.exec(document.body.textContent); return m ? +m[1] : 0; });
    check(opCount >= 700, `Operation list is populated (${opCount} operations)`);
    if (ANALYTICS_META.test(sourceIndex)) {
      await first.page.waitForFunction(() => /Analytics on/.test(document.getElementById('hsAnalyticsPrefs')?.textContent || ''), null, { timeout: 10000 }).catch(() => {});
      const footer = await first.page.evaluate(() => document.getElementById('hsAnalyticsPrefs')?.textContent || '');
      check(/Analytics on/.test(footer) && /Opt out/.test(footer), 'Footer shows analytics on, with an opt-out', footer);
      for (let waited = 0; waited < 10000 && !collected.length; waited += 250) await first.page.waitForTimeout(250);
      check(collected.some(c => c.origin === origin && c.url.endsWith('/v1/events') && c.body.includes('"page_view"')), 'Analytics events are sent from the launcher origin', JSON.stringify(collected.slice(0, 2)));
    }
    await first.page.evaluate(() => localStorage.setItem('hexspindle.ci.persist', 'kept'));

    const recipes = JSON.parse(readFileSync(join(HERE, 'ci-recipes.json'), 'utf8'));
    let recipeFailures = 0;
    for (const [i, t] of recipes.entries()) {
      const { page, errors } = await open(context, shareLink(t.recipe, t.input));
      const result = t.shapeOnly
        ? await outputOf(page, `new RegExp(${JSON.stringify(t.shapeOnly)}).test(${exactOutput})`)
        : await outputOf(page, `${exactOutput} === ${JSON.stringify(t.expect)}`);
      if (!result.ok || errors.length) { recipeFailures++; console.error(`FAIL recipe [${i}] ${t.label}: ${result.ok ? 'console errors: ' + errors.join(' | ') : `expected ${JSON.stringify(t.shapeOnly || t.expect)}, got ${JSON.stringify(result.got)}`}`); }
      await closeTab(page);
    }
    check(recipeFailures === 0, `${recipes.length - recipeFailures}/${recipes.length} regression recipes produce the expected output`);

    let run = await open(context, shareLink([{ module: 'Brotli Compress' }, { module: 'Brotli Decompress' }], 'launcher check: lazy library round trip'));
    let result = await outputOf(run.page, `document.getElementById('output').value === 'launcher check: lazy library round trip'`);
    check(result.ok && run.errors.length === 0, 'Lazily loaded library (Brotli) works', JSON.stringify(result.got || run.errors));
    await closeTab(run.page);
    run = await open(context, shareLink([{ module: 'From Hex' }, { module: 'Disassemble', args: ['x86 (64-bit)', 'Intel', '0x1000', true] }], '554889e5c3'));
    result = await outputOf(run.page, `/push\\s+rbp/.test(document.getElementById('output').value) && /\\bret\\b/.test(document.getElementById('output').value)`, 60000);
    check(result.ok && run.errors.length === 0, 'WebAssembly disassembler (Capstone) loads and works', JSON.stringify(result.got || run.errors));
    await closeTab(run.page);

    feedRequests.length = 0;
    run = await open(context, shareLink([{ module: 'SANS ISC IP' }], '8.8.8.8'), { ready: false });
    for (let waited = 0; waited < 20000 && !feedRequests.some(r => r.path === '/data/feeds/manifest.json'); waited += 250) await run.page.waitForTimeout(250);
    check(feedRequests.some(r => r.path === '/data/feeds/manifest.json'), 'Feed-based operations get their data through the launcher', JSON.stringify(feedRequests));
    await closeTab(run.page);

    // Closing the browser, and with it the first page, stops the launcher by itself.
    await closeTabs(context);
    context = null;
    const stopped = await Promise.race([launcher.exited, sleep(30000).then(() => null)]);
    check(stopped && stopped.code === 0, 'Launcher exits by itself after the last tab closes', JSON.stringify(stopped) + '\n' + launcher.output());
    if (!stopped) throw new Error('the launcher is still running');
    launcher = null;

    // Same address next time, so what the app saved is still there; --no-analytics turns analytics off.
    launcher = launch(['--no-analytics']);
    await launcher.ready;
    collected.length = 0;
    context = await chromium.launchPersistentContext(profile, { headless: true });
    await withStandIns(context);
    const again = await open(context, origin + '/');
    check(await again.page.evaluate(() => localStorage.getItem('hexspindle.ci.persist')) === 'kept', 'Saved browser data is still there after a restart');
    await again.page.waitForFunction(() => document.getElementById('hsAnalyticsPrefs')?.textContent, null, { timeout: 10000 }).catch(() => {});
    await again.page.waitForTimeout(2500);
    const footer = await again.page.evaluate(() => document.getElementById('hsAnalyticsPrefs')?.textContent || '');
    check(/Analytics off/.test(footer) && collected.length === 0 && again.errors.length === 0, '--no-analytics turns analytics off', JSON.stringify({ footer, collected: collected.length, errors: again.errors }));
    await closeTabs(context);
    context = null;
    const stoppedAgain = await Promise.race([launcher.exited, sleep(30000).then(() => null)]);
    check(stoppedAgain && stoppedAgain.code === 0, 'Launcher exits again after its last tab closes', JSON.stringify(stoppedAgain));
    launcher = null;
  } else {
    // Without a browser, simulate a tab: it opens, closes, and the launcher stops by itself.
    check((await get('/__hexspindle/heartbeat?tab=test-tab-0001', { method: 'POST', headers: { 'Sec-Fetch-Site': 'same-origin' } })).status === 204, 'A tab can register');
    check((await get('/__hexspindle/bye?tab=test-tab-0001', { method: 'POST' })).status === 204, 'A tab can sign off');
    keeper?.destroy(); // the last open tab goes away
    const stopped = await Promise.race([launcher.exited, sleep(20000).then(() => null)]);
    check(stopped && stopped.code === 0, 'Launcher exits by itself after the last tab closes', JSON.stringify(stopped) + '\n' + launcher.output());
    launcher = null;

    launcher = launch(['--no-analytics']);
    await launcher.ready;
    const plain = decoded(await get('/', { headers: { 'Accept-Encoding': 'gzip' } })).toString('utf8');
    check(!ANALYTICS_META.test(plain) && plain.includes(SESSION_TAG), '--no-analytics removes the analytics endpoint');
    launcher.child.kill();
    await launcher.exited;
    launcher = null;
  }
} catch (error) {
  failures.push(String(error?.stack || error));
  console.error(`FAIL ${error?.stack || error}`);
} finally {
  if (context) await context.close().catch(() => {});
  if (launcher) { launcher.child.kill(); await Promise.race([launcher.exited, sleep(5000)]); }
  await new Promise(done => feeds.close(done));
  // Windows can keep the browser profile locked for a moment after Chromium exits; a leftover temp folder is harmless.
  try { rmSync(work, { recursive: true, force: true, maxRetries: 5, retryDelay: 500 }); } catch (error) { console.warn(`Could not remove ${work}: ${error.code || error}`); }
}
console.log(`Desktop launcher checks: ${passed}/${passed + failures.length} passed`);
if (failures.length) process.exitCode = 1;
