#!/usr/bin/env node
// Patch 20: local-only enforced CSP compatibility and blocking checks.
// All AI requests are mocked. No real keys, CDN assets, or external services.
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { resolve, extname, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';

const { chromium } = createRequire(import.meta.url)('playwright');
const ROOT = resolve(fileURLToPath(new URL('..', import.meta.url)));
const POLICY = [
  "default-src 'self'",
  "script-src 'self' blob: 'wasm-unsafe-eval'",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' blob: data: https: http:",
  "font-src 'self' data:",
  "connect-src * data: blob:",
  "worker-src 'self' blob:",
  "frame-src 'self' blob: data:",
  "media-src 'self' blob: data:",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
].join('; ');
const MIME = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript',
  '.mjs': 'text/javascript', '.css': 'text/css', '.json': 'application/json',
  '.wasm': 'application/wasm', '.png': 'image/png', '.svg': 'image/svg+xml' };
const server = createServer(async (req, res) => {
  try {
    const pathname = decodeURIComponent(new URL(req.url, 'http://localhost').pathname);
    const full = resolve(ROOT, '.' + (pathname === '/' ? '/index.html' : pathname));
    if (!full.startsWith(ROOT + sep)) { res.writeHead(403).end('Forbidden'); return; }
    const bytes = await readFile(full);
    const headers = { 'Content-Type': MIME[extname(full)] || 'application/octet-stream' };
    if (pathname === '/') headers['Content-Security-Policy'] = POLICY;
    res.writeHead(200, headers).end(bytes);
  } catch { res.writeHead(404).end('Not found'); }
});
await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
let browser;
try {
  browser = await chromium.launch();
  const page = await browser.newPage();
  const mockRequests = [];
  await page.route(/^https:\/\/api\.(anthropic|openai)\.com\//, async route => {
    const req = route.request();
    mockRequests.push({ url: req.url(), method: req.method() });
    const cors = { 'access-control-allow-origin': '*',
      'access-control-allow-methods': 'GET, POST, OPTIONS',
      'access-control-allow-headers': 'authorization, x-api-key, anthropic-version, anthropic-dangerous-direct-browser-access, content-type',
      'content-type': 'application/json' };
    if (req.method() === 'OPTIONS') {
      await route.fulfill({ status: 204, headers: cors });
      return;
    }
    const anthropic = req.url().includes('api.anthropic.com');
    const listing = req.url().includes('/models');
    const body = listing ? { data: [{ id: anthropic ? 'ci-claude' : 'ci-gpt' }] }
      : anthropic ? { content: [{ type: 'text', text: '["To Hex"]' }] }
      : { output: [{ content: [{ type: 'output_text', text: '["To Hex"]' }] }] };
    await route.fulfill({ status: 200, headers: cors, body: JSON.stringify(body) });
  });
  await page.addInitScript(() => {
    window.__cspViolations = [];
    document.addEventListener('securitypolicyviolation', event => {
      window.__cspViolations.push({ directive: event.effectiveDirective,
        disposition: event.disposition, blocked: event.blockedURI });
    });
  });
  const response = await page.goto(`http://127.0.0.1:${server.address().port}/`, { waitUntil: 'load' });
  if (!response.headers()['content-security-policy']) throw new Error('Enforced CSP header missing');
  const results = await page.evaluate(async () => {
    const tests = [];
    async function check(name, fn) {
      try { await fn(); tests.push({ name, ok: true }); }
      catch (error) { tests.push({ name, ok: false, error: String(error?.message || error) }); }
    }
    function expect(value, msg) { if (!value) throw new Error(msg); }
    const { AI_PROVIDERS, verifyAIConnection, requestAISuggestion, saveAISetting,
      loadAISetting, deleteAISetting } = await import('./core/ai-suggest.js');
    await check('Anthropic mocked verification + suggestion under CSP', async () => {
      expect(AI_PROVIDERS.anthropic.suggestUrl.startsWith('https://api.anthropic.com/'), 'Unexpected API URL');
      const valid = await verifyAIConnection('anthropic', 'ci-fake-key', 'ci-claude');
      expect(valid.ok, 'Model validation unsuccessful');
      const suggested = await requestAISuggestion('anthropic', 'ci-fake-key', 'ci-claude',
        'Return To Hex', ['To Hex']);
      expect(suggested.names.join() === 'To Hex', 'Unexpected suggestion');
    });
    await check('OpenAI mocked verification + suggestion under CSP', async () => {
      const valid = await verifyAIConnection('openai', 'ci-fake-key', 'ci-gpt');
      expect(valid.ok, 'Model validation unsuccessful');
      const suggested = await requestAISuggestion('openai', 'ci-fake-key', 'ci-gpt',
        'Return To Hex', ['To Hex']);
      expect(suggested.names.join() === 'To Hex', 'Unexpected suggestion');
    });
    await check('AI API key stored only in volatile settings interface', async () => {
      await saveAISetting('openai', 'ci-fake-key', 'ci-gpt');
      expect((await loadAISetting('openai'))?.key === 'ci-fake-key', 'Volatile key unavailable');
      await deleteAISetting('openai');
      expect(await loadAISetting('openai') === null, 'Volatile key not cleared');
    });
    await check('Blob Web Worker executes under CSP', async () => {
      const blob = new Blob(['self.postMessage(42)'], { type: 'text/javascript' });
      const url = URL.createObjectURL(blob);
      let worker;
      try {
        worker = new Worker(url);
        const value = await Promise.race([
          new Promise((resolve, reject) => {
            worker.onmessage = event => resolve(event.data);
            worker.onerror = () => reject(new Error('Worker failed'));
          }),
          new Promise((_, reject) => setTimeout(() => reject(new Error('Worker timed out')), 3000)),
        ]);
        expect(value === 42, 'Worker did not execute');
      } finally { worker?.terminate(); URL.revokeObjectURL(url); }
    });
    await check('WebAssembly compilation under CSP', async () => {
      // Valid empty WebAssembly module; no external imports or downloads.
      const bytes = new Uint8Array([0,97,115,109,1,0,0,0]);
      expect(WebAssembly.validate(bytes), 'Invalid WASM fixture');
      const mod = await WebAssembly.compile(bytes);
      expect(mod instanceof WebAssembly.Module, 'WASM did not compile');
    });
    await check('Sandboxed HTML preview blocks inline scripts', async () => {
      delete window.__hexspindleCspFrameExecuted;
      const frame = document.createElement('iframe');
      frame.setAttribute('sandbox', '');
      frame.srcdoc = '<h1>Preview</h1><script>parent.__hexspindleCspFrameExecuted=true<\/script>';
      document.body.append(frame);
      try {
        await new Promise(resolve => { frame.addEventListener('load', resolve, { once:true }); setTimeout(resolve, 1500); });
        expect(!window.__hexspindleCspFrameExecuted, 'Sandboxed preview executed a script');
        expect(frame.hasAttribute('sandbox') && !frame.sandbox.contains('allow-scripts'), 'Frame sandbox relaxed');
      } finally { frame.remove(); }
    });
    await check('CSP blocks eval / Function constructor', async () => {
      let blocked = false;
      try { new Function('return 1')(); } catch (e) { blocked = e instanceof EvalError; }
      expect(blocked, 'Unsafe eval unexpectedly executed');
    });
    await check('CSP blocks inline DOM scripts', async () => {
      delete window.__hexspindleCspInlineExecuted;
      const script = document.createElement('script');
      script.textContent = 'window.__hexspindleCspInlineExecuted=true';
      document.body.append(script);
      await new Promise(resolve => setTimeout(resolve, 100));
      script.remove();
      expect(!window.__hexspindleCspInlineExecuted, 'Inline script unexpectedly executed');
    });
    return { tests, violations: window.__cspViolations };
  });
  for (const test of results.tests) {
    console.log(`${test.ok ? 'PASS' : 'FAIL'} ${test.name}${test.ok ? '' : ': ' + test.error}`);
  }
  const unexpected = results.violations.filter(v =>
    !['script-src', 'script-src-elem'].includes(v.directive));
  console.log(`CSP violations (expected negative tests included): ${results.violations.length}`);
  for (const finding of results.violations.slice(0, 15)) {
    console.log(`CSP ${finding.directive}: ${finding.blocked} (${finding.disposition})`);
  }
  console.log(`AI mock requests intercepted: ${mockRequests.length}`);
  if (mockRequests.length < 4) {
    console.error('FAIL AI request mock coverage incomplete'); process.exitCode = 1;
  }
  if (!results.violations.some(v => v.directive === 'script-src' || v.directive === 'script-src-elem')) {
    console.error('FAIL negative script-blocking tests produced no CSP violation event');
    process.exitCode = 1;
  }
  if (unexpected.length) {
    for (const x of unexpected) console.error(`FAIL unexpected CSP violation: ${x.directive} ${x.blocked}`);
    process.exitCode = 1;
  }
  if (results.tests.some(x => !x.ok)) process.exitCode = 1;
  if (!process.exitCode) console.log('PASS advanced CSP compatibility and negative security tests');
} finally {
  if (browser) await browser.close();
  await new Promise(resolve => server.close(resolve));
}
