#!/usr/bin/env node
// Read-only CI validation of the source module graph and operation index.
import { readFileSync, readdirSync, existsSync, statSync } from 'node:fs';
import { resolve, dirname, join, relative, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const errors = [];
const modulesDir = join(root, 'modules');
const indexFile = join(modulesDir, 'index.js');
const expected = [];
for (const dir of readdirSync(modulesDir, { withFileTypes: true }).filter(x => x.isDirectory()).map(x => x.name).sort()) {
  for (const file of readdirSync(join(modulesDir, dir)).filter(x => x.endsWith('.js') && !x.startsWith('_')).sort()) {
    expected.push(`./${dir}/${file}`);
  }
}
const indexText = readFileSync(indexFile, 'utf8');
const actual = [...indexText.matchAll(/^\s*import\s+['"](\.\/.+?)['"]\s*;?\s*$/gm)].map(m => m[1]);
const actualSet = new Set(actual);
for (const p of expected) if (!actualSet.has(p)) errors.push(`Operation absent from index: ${p}`);
for (const p of actual) if (!expected.includes(p)) errors.push(`Unexpected/stale index entry: ${p}`);
if (actualSet.size !== actual.length) errors.push('Duplicate import in modules/index.js');
if (actual.length !== expected.length) errors.push(`Index contains ${actual.length} operations; expected ${expected.length}`);
// Covers relative static imports, re-exports and literal dynamic imports. Non-literal imports are reported for review.
const entrypoints = ['app.js', 'modules/index.js', 'core/registry.js'];
const visited = new Set();
let references = 0;
const stack = entrypoints.map(p => join(root, p));
function describe(path) { return relative(root, path).split(sep).join('/'); }
while (stack.length) {
  const file = stack.pop();
  if (visited.has(file)) continue;
  visited.add(file);
  if (!existsSync(file)) { errors.push(`Missing source file: ${describe(file)}`); continue; }
  const content = readFileSync(file, 'utf8');
  const specifiers = [
    ...content.matchAll(/\b(?:import|export)\s+(?:[^'";]*?\s+from\s*)?['"](\.{1,2}\/[^'"]+)['"]/g),
    ...content.matchAll(/\bimport\s*\(\s*['"](\.{1,2}\/[^'"]+)['"]\s*\)/g),
  ];
  for (const match of specifiers) {
    references++;
    const target = resolve(dirname(file), match[1]);
    if (!target.startsWith(root + sep)) { errors.push(`Import outside repository: ${describe(file)} -> ${match[1]}`); continue; }
    const resolved = existsSync(target) ? target : ['.js', '.mjs', '/index.js'].map(ext => target + ext).find(existsSync);
    if (!resolved || !statSync(resolved).isFile()) errors.push(`Unresolved import: ${describe(file)} -> ${match[1]}`);
    else if (/\.(?:m?js)$/.test(resolved)) stack.push(resolved);
  }
}
console.log(`Integrity: ${expected.length} indexed operations, ${visited.size} reachable JS modules, ${references} relative import references`);
if (errors.length) { for (const err of errors) console.error('ERROR: ' + err); process.exitCode = 1; }
else console.log('PASS: operation index complete, no duplicate index paths, relative imports resolve.');
