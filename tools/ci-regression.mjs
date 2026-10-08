#!/usr/bin/env node
// HexSpindle engine regression suite. Dev-only; no external network calls.
// Execute from tools/: node ci-regression.mjs
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { dirname, extname, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';

const { chromium } = createRequire(import.meta.url)('playwright');
const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const types = { '.html': 'text/html', '.js': 'text/javascript', '.mjs': 'text/javascript', '.json': 'application/json', '.wasm': 'application/wasm', '.css': 'text/css' };
const server = createServer(async (req, res) => {
  try {
    const url = new URL(req.url, 'http://localhost');
    const path = resolve(root, '.' + decodeURIComponent(url.pathname === '/' ? '/index.html' : url.pathname));
    if (path !== root && !path.startsWith(root + sep)) { res.writeHead(403); res.end(); return; }
    const body = await readFile(path);
    res.writeHead(200, { 'Content-Type': types[extname(path)] || 'application/octet-stream', 'Cache-Control': 'no-store' });
    res.end(body);
  } catch { res.writeHead(404); res.end('not found'); }
});

async function main() {
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const browser = await chromium.launch();
  try {
    const page = await browser.newPage();
    await page.goto(`http://127.0.0.1:${server.address().port}/`, { waitUntil: 'load' });
    const results = await page.evaluate(async () => {
      await import('./modules/index.js');
      const { MODULES, register } = await import('./core/registry.js');
      const { bake } = await import('./core/engine.js');
      const cases = [];
      const hex = b => Array.from(b, x => x.toString(16).padStart(2, '0')).join('');
      const input = s => new TextEncoder().encode(s);
      async function check(name, fn) {
        try { await fn(); cases.push({ name, ok: true }); }
        catch (e) { cases.push({ name, ok: false, error: String(e?.stack || e) }); }
      }
      function equal(actual, expected, what) {
        if (actual !== expected) throw new Error(`${what}: expected ${JSON.stringify(expected)}, received ${JSON.stringify(actual)}`);
      }
      async function run(bytes, recipe, upto = null, options = {}) {
        const result = await bake(bytes, recipe, upto, options);
        if (result.error) throw new Error(JSON.stringify(result.error));
        return result;
      }
      const op = (module, args = [], more = {}) => ({ module, args, ...more });

      await check('Binary hex decoding preserves NUL, 0xff and 0x80', async () => {
        const r = await run(input('00017f80ff'), [op('From Hex')]);
        equal(hex(r.output), '00017f80ff', 'raw binary bytes');
      });
      await check('Binary hex -> Base64 -> binary round-trip', async () => {
        const r = await run(input('00017f80ff'), [op('From Hex'), op('To Base64'), op('From Base64')]);
        equal(hex(r.output), '00017f80ff', 'binary round-trip');
      });
      await check('Gzip -> Gunzip preserves UTF-8', async () => {
        const s = 'Café ☕ — HexSpindle';
        const r = await run(input(s), [op('Gzip'), op('Gunzip')]);
        equal(new TextDecoder().decode(r.output), s, 'UTF-8 round-trip');
      });
      await check('Disabled step is skipped, then next step runs', async () => {
        const r = await run(input('Hi'), [op('To Hex', [], { disabled: true }), op('To Base64')]);
        equal(new TextDecoder().decode(r.output), 'SGk=', 'disabled step');
        if (!r.steps[0]?.skipped) throw new Error('step 0 was not marked skipped');
      });
      await check('Sequential upto stops at requested step', async () => {
        const ops = [op('To Hex'), op('From Hex'), op('To Base64')];
        const r0 = await run(input('Hi'), ops, 0);
        equal(new TextDecoder().decode(r0.output).toLowerCase(), '48 69', 'step 0');
        const r1 = await run(input('Hi'), ops, 1);
        equal(new TextDecoder().decode(r1.output), 'Hi', 'step 1');
        const r2 = await run(input('Hi'), ops, 2);
        equal(new TextDecoder().decode(r2.output), 'SGk=', 'step 2');
      });
      await check('Sequential cache avoids re-running completed operations', async () => {
        let count = 0;
        const id = '__CI_REGRESSION_COUNTING__';
        register(id, 'CI-only counter', [], bytes => { count++; return bytes; });
        try {
          const ops = [op(id), op(id), op(id)];
          const cache = new Map();
          await run(input('test'), ops, 0, { parallelCache: cache });
          await run(input('test'), ops, 1, { parallelCache: cache });
          await run(input('test'), ops, 2, { parallelCache: cache });
          equal(count, 3, 'executions with cache');
        } finally { delete MODULES[id]; }
      });
      await check('Unknown operation reports an engine error', async () => {
        const r = await bake(input('abc'), [op('__CI_NONEXISTENT_OPERATION__')]);
        if (!r.error || !/unknown module/i.test(r.error.message || '')) throw new Error('No unknown-operation error returned');
      });
      return cases;
    });
    let failed = 0;
    for (const r of results) {
      if (r.ok) console.log(`PASS ${r.name}`);
      else { failed++; console.error(`FAIL ${r.name}\n${r.error}`); }
    }
    console.log(`Engine regressions: ${results.length - failed}/${results.length} passed`);
    if (failed) process.exitCode = 1;
  } finally {
    await browser.close();
    await new Promise(resolve => server.close(resolve));
  }
}
main().catch(e => { console.error(e); process.exitCode = 1; server.close(); });
