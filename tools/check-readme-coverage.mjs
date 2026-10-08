#!/usr/bin/env node
// Validates or regenerates the README operation-coverage section from the operation index.
// Run: node tools/check-readme-coverage.mjs [--write]
import { readFileSync, writeFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const readmePath = resolve(root, 'README.md');
const indexPath = resolve(root, 'modules/index.js');
const readme = readFileSync(readmePath, 'utf8');
const index = readFileSync(indexPath, 'utf8');
const labels = new Map([
 ['encryption_encoding','Encryption / Encoding'], ['data_format','Data Format'],
 ['hashing','Hashing'],['utils','Utils'],['public_key','Public Key'],
 ['multimedia','Multimedia'],['networking','Networking'],['compression','Compression'],
 ['other','Other'],['arithmetic_logic','Arithmetic / Logic'],['code_tidy','Code Tidy'],
 ['forensics','Forensics'],['extractors','Extractors'],['date_time','Date / Time'],
 ['flow_control','Flow Control'],['language','Language'],
]);
const paths = [...index.matchAll(/^\s*import\s+['"]\.\/([^/'"]+)\/([^/'"]+\.js)['"]\s*;?\s*$/gm)];
if (paths.length === 0) throw new Error('No operation imports found in modules/index.js');
const counts = new Map();
for (const m of paths) {
  if (m[2].startsWith('_')) throw new Error(`Unexpected helper in operation index: ${m[0]}`);
  if (!labels.has(m[1])) throw new Error(`Unknown operation category: ${m[1]}`);
  counts.set(m[1], (counts.get(m[1]) || 0) + 1);
}
const total = [...counts.values()].reduce((a,b)=>a+b,0);
const sorted = [...counts.entries()].sort((a,b)=>b[1]-a[1] || labels.get(a[0]).localeCompare(labels.get(b[0])));
const section = [
 '## Operation Coverage', '',
 `HexSpindle currently implements **${total} operations across all ${counts.size} supported categories**.`, '',
 'Operations are added incrementally. Features that have not yet been ported are simply omitted from the operation registry, allowing the rest of the application to remain fully functional.', '',
 'The **Magic** decoder uses the same registry when evaluating candidate transformations. Unsupported candidates are automatically skipped, which means Magic\'s decoding coverage expands naturally as new operations are implemented.', '',
 '| Category | Operations |', '|---|---:|',
 ...sorted.map(([k,n])=>`| ${labels.get(k)} | ${n} |`),
 `| **Total** | **${total}** |`, '',
].join('\n');
const pattern = /## Operation Coverage\r?\n[\s\S]*?(?=## Architecture\r?\n)/;
if (!pattern.test(readme)) throw new Error('README Operation Coverage section or Architecture heading missing');
const normalized = readme.replace(pattern, section);
if (process.argv.includes('--write')) {
  if (normalized !== readme) writeFileSync(readmePath, normalized);
  console.log(`Updated README coverage: ${total} operations across ${counts.size} categories`);
} else if (normalized !== readme) {
  console.error('README operation coverage is out of date. Run: node tools/check-readme-coverage.mjs --write');
  process.exitCode = 1;
} else {
  console.log(`PASS README coverage: ${total} indexed operations across ${counts.size} categories`);
}
