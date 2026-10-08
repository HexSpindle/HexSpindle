#!/usr/bin/env node
// CI-only CSP browser checks. Shared policy/server: ci-csp-shared.mjs.
import { createRequire } from 'node:module';
import { POLICY, startCspServer } from './ci-csp-shared.mjs';
const { chromium } = createRequire(import.meta.url)('playwright');
const server = await startCspServer({ mode:'report-only' });
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
