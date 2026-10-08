#!/usr/bin/env node
// Conservative static startup graph budget for HexSpindle's browser ES modules.
// Static imports (including re-exports) are startup dependencies; dynamic imports are not.
// No module code is evaluated, and no remote requests are made.
import { readFileSync, existsSync, statSync } from 'node:fs';
import { resolve, dirname, relative, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const entry = resolve(root, 'app.js');
const files = new Set();
const missing = [];
const stack = [entry];
const dynamic = [];
const rel = p => relative(root, p).split(sep).join('/');
const staticImport = /^\s*(?:import\s+(?!\()(?:(?:[^'";]*?\s+from\s*)?)|export\s+(?:[^'";]*?\s+from\s*))['"](\.{1,2}\/[^'"\r\n]+)['"]/gm;
const dynamicImport = /\bimport\s*\(\s*['"](\.{1,2}\/[^'"\r\n]+)['"]\s*\)/g;
function locate(source, spec) {
  const path = resolve(dirname(source), spec);
  if (!path.startsWith(root + sep)) return null;
  for (const candidate of [path, path + '.js', path + '.mjs', resolve(path, 'index.js')]) {
    if (existsSync(candidate) && statSync(candidate).isFile()) return candidate;
  }
  return null;
}
while (stack.length) {
  const p = stack.pop();
  if (files.has(p)) continue;
  files.add(p);
  const content = readFileSync(p, 'utf8');
  for (const m of content.matchAll(staticImport)) {
    const target = locate(p, m[1]);
    if (target) stack.push(target);
    else missing.push(`${rel(p)} -> ${m[1]}`);
  }
  for (const m of content.matchAll(dynamicImport)) dynamic.push({ from: rel(p), specifier: m[1] });
}
const records = [...files].map(p => ({ path: rel(p), bytes: statSync(p).size })).sort((a,b)=>b.bytes-a.bytes);
const total = records.reduce((s,x)=>s+x.bytes,0);
const mb = (total / 1048576).toFixed(2);
const max = Number(process.env.HEXSPINDLE_STARTUP_BUDGET_BYTES || 12582912);
console.log(`Startup static graph: ${records.length} modules, ${total} bytes (${mb} MiB) of uncompressed source`);
console.log('Largest static dependencies:');
for (const x of records.slice(0,15)) console.log(`  ${(x.bytes/1048576).toFixed(2)} MiB  ${x.path}`);
console.log(`Literal dynamic imports in the static graph: ${dynamic.length}`);
for (const x of dynamic.slice(0,10)) console.log(`  lazy ${x.from} -> ${x.specifier}`);
if (missing.length) {
  missing.forEach(x=>console.error(`ERROR missing static import: ${x}`));
  process.exitCode=1;
}
if (total > max) {
  console.error(`ERROR startup graph exceeds budget (${total} > ${max} bytes)`);
  process.exitCode=1;
} else console.log(`PASS startup graph budget (${total} <= ${max} bytes)`);
console.log('Note: this is an upper-bound source-graph estimate, not transferred bytes, cache costs, or measured browser load time.');
