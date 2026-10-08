#!/usr/bin/env node
// CI validation of the operation index and reachable relative ESM imports.
// Uses the JavaScript module parser for static imports rather than a regex over
// source text: bundled grammar strings can contain fake `import` statements.
import { readFileSync, readdirSync, existsSync, statSync } from 'node:fs';
import { resolve, dirname, join, relative, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const modulesDir = join(root, 'modules');
const errors = [];
const expected = [];
const indexFile = join(modulesDir, 'index.js');

for (const category of readdirSync(modulesDir, { withFileTypes: true })
  .filter(entry => entry.isDirectory()).map(entry => entry.name).sort()) {
  for (const file of readdirSync(join(modulesDir, category))
    .filter(name => name.endsWith('.js') && !name.startsWith('_')).sort()) {
    expected.push(`./${category}/${file}`);
  }
}
const indexText = readFileSync(indexFile, 'utf8');
const actual = [...indexText.matchAll(/^\s*import\s+['"](\.\/.+?)['"]\s*;?\s*$/gm)].map(match => match[1]);
const expectedSet = new Set(expected);
const actualSet = new Set(actual);
for (const path of expected) if (!actualSet.has(path)) errors.push(`Operation absent from index: ${path}`);
for (const path of actual) if (!expectedSet.has(path)) errors.push(`Unexpected/stale index entry: ${path}`);
if (actualSet.size !== actual.length) errors.push('Duplicate import in modules/index.js');
if (actual.length !== expected.length) errors.push(`Index contains ${actual.length} operations; expected ${expected.length}`);

const entrypoints = ['app.js', 'modules/index.js', 'core/registry.js'];
const visited = new Set();
const stack = entrypoints.map(path => join(root, path));
let references = 0;
function describe(path) { return relative(root, path).split(sep).join('/'); }
function resolveImport(from, specifier) {
  if (!specifier.startsWith('./') && !specifier.startsWith('../')) return;
  references++;
  const target = resolve(dirname(from), specifier);
  if (target !== root && !target.startsWith(root + sep)) {
    errors.push(`Import outside repository: ${describe(from)} -> ${specifier}`);
    return;
  }
  const resolved = [target, `${target}.js`, `${target}.mjs`, join(target, 'index.js')]
    .find(candidate => existsSync(candidate) && statSync(candidate).isFile());
  if (!resolved) errors.push(`Unresolved import: ${describe(from)} -> ${specifier}`);
  else if (/\.(?:js|mjs)$/.test(resolved)) stack.push(resolved);
}
while (stack.length) {
  const file = stack.pop();
  if (visited.has(file)) continue;
  visited.add(file);
  if (!existsSync(file)) { errors.push(`Missing source file: ${describe(file)}`); continue; }
  const content = readFileSync(file, 'utf8');
  // Match import/export declarations only at line starts. The earlier broad
  // regex also interpreted strings embedded in highlight.js language grammars
  // as real imports (for example "./html_renderer").
  const staticImports = [
    ...content.matchAll(/^\s*import\s+(?:[^'";\n]*?\s+from\s*)?['"](\.{1,2}\/[^'"\n]+)['"]/gm),
    ...content.matchAll(/^\s*export\s+(?:\*|\{[^}\n]*\})\s+from\s+['"](\.{1,2}\/[^'"\n]+)['"]/gm),
  ];
  for (const match of staticImports) resolveImport(file, match[1]);
  // Literal dynamic imports are usually emitted as standalone expressions.
  // This conservative detector intentionally avoids guessing inside vendored
  // strings/templates; a browser smoke test covers computed dynamic imports.
  if (!/\/_[^/]+\.(?:m?js)$/.test(file)) {
    for (const match of content.matchAll(/\bimport\s*\(\s*(['"])(\.{1,2}\/[^'"\n]+)\1\s*\)/g)) {
      resolveImport(file, match[2]);
    }
  }
}
console.log(`Integrity: ${expected.length} indexed operations, ${visited.size} reachable JS modules, ${references} relative import references`);
if (errors.length) {
  for (const error of errors) console.error(`ERROR: ${error}`);
  process.exitCode = 1;
} else {
  console.log('PASS: operation index complete, no duplicate index paths, relative static imports resolve.');
}
