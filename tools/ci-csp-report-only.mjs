#!/usr/bin/env node
// Report-only CSP compatibility smoke test. Does NOT change production CSP.
// The local test server sends a real HTTP Content-Security-Policy-Report-Only
// response header, which GitHub Pages cannot be configured to send via _headers.
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { resolve, extname, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';

const { chromium } = createRequire(import.meta.url)('playwright');
const ROOT = resolve(fileURLToPath(new URL('..', import.meta.url)));
const MIME = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8', '.svg': 'image/svg+xml',
  '.wasm': 'application/wasm', '.png': 'image/png', '.jpg': 'image/jpeg',
  '.woff2': 'font/woff2',
};

// Candidate policy, NOT a statement of compliance or proof of safety.
// connect-src is deliberately broad to preserve user-specified HTTP URLs.
// Avoid unsafe-eval; allow WebAssembly compilation where supported.
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

const server = createServer(async (req, res) => {
  try {
    const pathname = decodeURIComponent(new URL(req.url, 'http://localhost').pathname);
    const filename = pathname === '/' ? '/index.html' : pathname;
    const full = resolve(ROOT, '.' + filename);
    if (!full.startsWith(ROOT + sep)) {
      res.writeHead(403).end('Forbidden'); return;
    }
    const bytes = await readFile(full);
    const headers = { 'Content-Type': MIME[extname(full)] || 'application/octet-stream' };
    if (filename === '/index.html') headers['Content-Security-Policy-Report-Only'] = POLICY;
    res.writeHead(200, headers).end(bytes);
  } catch {
    res.writeHead(404).end('Not found');
  }
});
await new Promise(done => server.listen(0, '127.0.0.1', done));

let browser;
try {
  browser = await chromium.launch();
  const page = await browser.newPage();
  await page.addInitScript(() => {
    window.__cspFindings = [];
    document.addEventListener('securitypolicyviolation', event => {
      window.__cspFindings.push({
        directive: event.violatedDirective,
        blocked: event.blockedURI,
        disposition: event.disposition,
        source: event.sourceFile,
      });
    });
  });
  const url = `http://127.0.0.1:${server.address().port}/`;
  const response = await page.goto(url, { waitUntil: 'load' });
  if (response?.status() !== 200) throw new Error(`Application returned HTTP ${response?.status()}`);
  if (!response.headers()['content-security-policy-report-only']) {
    throw new Error('Local test server did not set CSP report-only header');
  }
  // Import the operation registry as well, to cover lazy module graph startup.
  await page.evaluate(() => import('./modules/index.js'));
  await page.waitForTimeout(350);
  const errors = [];
  const status = await page.evaluate(() => ({
    title: document.title,
    operations: document.querySelector('#opCount')?.textContent?.trim() || '',
    findings: window.__cspFindings,
  }));
  if (!status.title.includes('HexSpindle')) errors.push('Application title not found');
  console.log('PASS report-only CSP delivered as an HTTP header');
  console.log('PASS application shell and operation registry loaded');
  console.log('Candidate policy: ' + POLICY);
  console.log(`CSP compatibility violations on startup: ${status.findings.length}`);
  for (const v of status.findings.slice(0, 30)) {
    console.log(`ADVISORY ${v.directive}: ${v.blocked} (${v.disposition})`);
  }
  if (errors.length) {
    for (const error of errors) console.error('FAIL ' + error);
    process.exitCode = 1;
  } else {
    console.log('PASS CSP report-only browser smoke test (advisories do not fail CI)');
  }
} finally {
  if (browser) await browser.close();
  await new Promise(done => server.close(done));
}
