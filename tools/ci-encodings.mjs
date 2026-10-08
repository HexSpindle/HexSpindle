#!/usr/bin/env node
// Browser-level reference vectors for the encoding subsystem.
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { resolve, join, extname, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';
const { chromium } = createRequire(import.meta.url)('playwright');
const ROOT = resolve(fileURLToPath(new URL('..', import.meta.url)));
const MIME = { '.js': 'text/javascript', '.mjs': 'text/javascript', '.html': 'text/html; charset=utf-8', '.json': 'application/json' };
const server = createServer(async (req, res) => {
  try {
    const pathname = decodeURIComponent(new URL(req.url, 'http://localhost').pathname);
    const requested = pathname === '/' ? '/index.html' : pathname;
    const full = resolve(ROOT, '.' + requested);
    if (!full.startsWith(ROOT + sep)) { res.writeHead(403); res.end(); return; }
    const bytes = await readFile(full);
    res.writeHead(200, { 'Content-Type': MIME[extname(full)] || 'application/octet-stream' });
    res.end(bytes);
  } catch { res.writeHead(404); res.end('Not found'); }
});
await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
let browser;
try {
  browser = await chromium.launch();
  const page = await browser.newPage();
  await page.goto(`http://127.0.0.1:${server.address().port}/`, { waitUntil: 'load' });
  const tests = await page.evaluate(async () => {
    const { encodeText, decodeBytes, ENCODINGS } = await import('./modules/language/encode_text.js');
    const vectors = [
      ['UTF-8 ASCII', 'UTF-8', 'Hello', '48656c6c6f'],
      ['UTF-8 multilingual', 'UTF-8', 'سلام🌍', 'd8b3d984d8a7d985f09f8c8d'],
      ['UTF-16LE', 'UTF-16LE', 'A😀', '41003dd800de'],
      ['UTF-16BE', 'UTF-16BE', 'A😀', '0041d83dde00'],
      ['UTF-32LE', 'UTF-32LE', 'A😀', '4100000000f60100'],
      ['Latin1', 'ISO-8859-1 (Latin1)', 'Café', '436166e9'],
      ['Windows-1252 euro', 'Windows-1252', '€', '80'],
      ['CP437 graphic', 'CP437', 'é', '82'],
      ['Shift-JIS', 'Shift_JIS', '日本', '93fa967b'],
      ['GBK', 'GBK', '中文', 'd6d0cec4'],
      ['EUC-KR', 'EUC-KR', '한글', 'c7d1b1db'],
    ];
    const hex = b => Array.from(b, x => x.toString(16).padStart(2, '0')).join('');
    const results = [];
    for (const [label, name, input, expected] of vectors) {
      try {
        if (!ENCODINGS.includes(name)) throw Error('Not in encoding dropdown');
        const output = encodeText(input, name, false);
        if (output && typeof output.then === 'function') throw Error('encodeText API unexpectedly became asynchronous');
        const actual = hex(output);
        if (actual !== expected) throw Error(`expected ${expected}, got ${actual}`);
        const roundtrip = decodeBytes(output, name);
        if (roundtrip && typeof roundtrip.then === 'function') throw Error('decodeBytes API unexpectedly became asynchronous');
        if (roundtrip !== input) throw Error(`roundtrip expected ${JSON.stringify(input)}, got ${JSON.stringify(roundtrip)}`);
        results.push({ label, ok: true });
      } catch (e) { results.push({ label, ok: false, error: String(e.message || e) }); }
    }
    return results;
  });
  for (const t of tests) console.log(`${t.ok ? 'PASS' : 'FAIL'} ${t.label}${t.ok ? '' : ': ' + t.error}`);
  console.log(`Encoding vectors: ${tests.filter(t => t.ok).length}/${tests.length} passed`);
  if (tests.some(t => !t.ok)) process.exitCode = 1;
} finally {
  if (browser) await browser.close();
  await new Promise(resolve => server.close(resolve));
}
