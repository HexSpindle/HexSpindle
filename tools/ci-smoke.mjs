#!/usr/bin/env node
// CI smoke test: serves this folder over local HTTP, loads index.html in headless Chromium,
// confirms the page and the operation registry load with no console errors, then bakes a set of
// known recipes through the real engine (dynamic-imported inside the page) and checks their
// output. Run from anywhere: `node tools/ci-smoke.mjs`.
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { extname, join, normalize } from 'node:path';
import { fileURLToPath } from 'node:url';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';

// require() (unlike ESM import) honors NODE_PATH, so this resolves whether playwright is installed
// locally (tools/node_modules via `npm install` in CI) or only on a global NODE_PATH.
const { chromium } = createRequire(import.meta.url)('playwright');

const ROOT = normalize(join(fileURLToPath(new URL('.', import.meta.url)), '..'));
const RECIPES_PATH = fileURLToPath(new URL('./ci-recipes.json', import.meta.url));

const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.mjs': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.wasm': 'application/wasm' };

function serve() {
  return new Promise((resolve) => {
    const server = createServer(async (req, res) => {
      try {
        let p = decodeURIComponent(req.url.split('?')[0]);
        if (p === '/') p = '/index.html';
        const full = join(ROOT, p);
        if (!full.startsWith(ROOT)) { res.writeHead(403); res.end(); return; }
        const body = await readFile(full);
        res.writeHead(200, { 'Content-Type': MIME[extname(full)] || 'application/octet-stream' });
        res.end(body);
      } catch {
        res.writeHead(404);
        res.end('not found');
      }
    });
    server.listen(0, '127.0.0.1', () => resolve(server));
  });
}

async function main() {
  const server = await serve();
  const port = server.address().port;
  const base = `http://127.0.0.1:${port}/`;
  const browser = await chromium.launch();
  let exitCode = 0;
  try {
    const page = await browser.newPage();
    const consoleErrors = [];
    page.on('console', (msg) => { if (msg.type() === 'error') consoleErrors.push(msg.text()); });
    page.on('pageerror', (err) => consoleErrors.push(String(err)));

    await page.goto(base, { waitUntil: 'load' });
    await page.waitForTimeout(300); // let module imports / init settle

    const opCount = await page.evaluate(async () => {
      const { MODULES } = await import('./core/registry.js');
      await import('./modules/index.js');
      return Object.keys(MODULES).length;
    });
    console.log(`Page loaded. Operation registry has ${opCount} operations.`);

    if (consoleErrors.length) {
      console.error('Console errors during page load:');
      consoleErrors.forEach((e) => console.error('  ' + e));
      exitCode = 1;
    } else {
      console.log('No console errors on load.');
    }

    const recipes = JSON.parse(readFileSync(RECIPES_PATH, 'utf-8'));
    const results = await page.evaluate(async (recipes) => {
      const { bake } = await import('./core/engine.js');
      const { encodeUtf8 } = await import('./core/util.js');
      const out = [];
      for (const t of recipes) {
        try {
          const input = encodeUtf8(t.input ?? '');
          const r = await bake(input, t.recipe);
          if (r.error) { out.push({ ok: false, label: t.label, error: `step ${r.error.step}: ${r.error.message}` }); continue; }
          out.push({ ok: true, label: t.label, output: new TextDecoder().decode(r.output) });
        } catch (e) {
          out.push({ ok: false, label: t.label, error: String(e && e.message || e) });
        }
      }
      return out;
    }, recipes);

    for (const [i, t] of recipes.entries()) {
      const r = results[i];
      if (!r.ok) { console.error(`FAIL [${i}] ${t.label}: ${r.error}`); exitCode = 1; continue; }
      if (t.shapeOnly) {
        const re = new RegExp(t.shapeOnly);
        if (!re.test(r.output)) { console.error(`FAIL [${i}] ${t.label}: output "${r.output}" does not match shape /${t.shapeOnly}/`); exitCode = 1; continue; }
      } else if (r.output !== t.expect) {
        console.error(`FAIL [${i}] ${t.label}: expected ${JSON.stringify(t.expect)}, got ${JSON.stringify(r.output)}`);
        exitCode = 1;
        continue;
      }
      console.log(`PASS [${i}] ${t.label}`);
    }
  } finally {
    await browser.close();
    server.close();
  }
  process.exit(exitCode);
}

main();
