#!/usr/bin/env node
// CI check for HexSpindle's reviewed vendored-license inventory.
// This is a bookkeeping check, NOT a legal compliance determination or security scan.
import { readFileSync, existsSync, statSync } from 'node:fs';
import { resolve, dirname, relative, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const issues = [];
const warnings = [];
const checked = new Set();
const licenseNames = new Set(['MIT','ISC','BSD-2-Clause','BSD-3-Clause','Apache-2.0','GPL-3','LGPL-3']);
function read(rel) { return readFileSync(resolve(ROOT, rel), 'utf8'); }
function file(rel) { return resolve(ROOT, rel); }
function validPath(rel) {
  if (typeof rel !== 'string' || !rel || rel.includes('\\') || rel.startsWith('/') || rel.split('/').includes('..')) return false;
  const resolved = file(rel);
  return resolved.startsWith(ROOT + sep);
}
function requireFile(rel, desc) {
  if (!validPath(rel)) { issues.push(`${desc}: invalid repository-relative path ${JSON.stringify(rel)}`); return false; }
  if (!existsSync(file(rel)) || !statSync(file(rel)).isFile()) { issues.push(`${desc}: missing ${rel}`); return false; }
  return true;
}
if (!requireFile('THIRD_PARTY_NOTICES.md', 'Attribution')) process.exit(1);
const notices = read('THIRD_PARTY_NOTICES.md');
if (!requireFile('tools/vendor-inventory.json', 'Inventory')) process.exit(1);
let inventory;
try { inventory = JSON.parse(read('tools/vendor-inventory.json')); }
catch (e) { console.error('Invalid inventory JSON:', e.message); process.exit(1); }
if (inventory?.schemaVersion !== 1 || !Array.isArray(inventory.components)) { console.error('Invalid inventory schema'); process.exit(1); }
for (const row of inventory.components) {
  if (!row || !validPath(row.path) || !row.path.startsWith('modules/') || !/\.m?js$/.test(row.path)) {
    issues.push(`Invalid component entry: ${JSON.stringify(row?.path)}`); continue;
  }
  if (checked.has(row.path)) issues.push(`Duplicate component: ${row.path}`);
  checked.add(row.path);
  requireFile(row.path, 'Vendored component');
  // Verify the *path* appears in the documentation as a quoted code span to avoid accidental substrings.
  if (!notices.includes('`' + row.path + '`')) issues.push(`Attribution missing for ${row.path}`);
  if (!Array.isArray(row.licenseFiles) || row.licenseFiles.length === 0) {
    issues.push(`No license texts listed for ${row.path}`); continue;
  }
  for (const licenseFile of row.licenseFiles) {
    if (!validPath(licenseFile) || !licenseFile.startsWith('licenses/') || !licenseFile.endsWith('.txt')) {
      issues.push(`Invalid license file reference for ${row.path}: ${licenseFile}`); continue;
    }
    const licenseName = licenseFile.slice('licenses/'.length, -'.txt'.length);
    if (!licenseNames.has(licenseName)) issues.push(`Unrecognized shared license text ${licenseFile}`);
    if (requireFile(licenseFile, row.path) && read(licenseFile).trim().length < 100)
      issues.push(`Shared license file suspiciously short: ${licenseFile}`);
  }
}
// Specific outstanding obligations are deliberately NOT reported as passing compliance.
// This sentinel keeps the outstanding-items section from disappearing accidentally.
for (const keyword of ['Tesseract.js:', 'OpenPGP.js:', 'Mixed-license bundles:']) {
  if (!notices.includes(keyword)) warnings.push(`Outstanding verification section changed or missing: ${keyword}`);
}
console.log(`Vendor inventory: ${checked.size} reviewed components; 7 common license families`);
for (const warning of warnings) console.warn('WARNING: ' + warning);
if (issues.length) {
  for (const issue of issues) console.error('ERROR: ' + issue);
  console.error(`FAIL: ${issues.length} vendor inventory issue(s)`);
  process.exitCode = 1;
} else {
  console.log('PASS: known vendored files, attribution entries and shared license texts are present.');
  console.log('NOTE: This does not verify upstream licenses, transitive bundle notices, or LGPL corresponding-source compliance.');
}
