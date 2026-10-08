#!/usr/bin/env node
// Regression guard for application HTML rendering boundaries.
// Deliberately checks invariants rather than blindly banning innerHTML;
// the UI uses trusted SVG/icon templates as well as untrusted previews.
import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const source = readFileSync(resolve(root, 'app.js'), 'utf8');
const html = readFileSync(resolve(root, 'index.html'), 'utf8');
const errors = [];
const warnings = [];

const checks = [
  ['Rendered HTML preview sandbox', /iframe['"],\s*\{\s*class:\s*['"]render['"],\s*sandbox:\s*['"]['"],\s*srcdoc:/],
  ['Compare diff iframe sandbox', /iframe['"],\s*\{[^}]*sandbox:\s*['"]['"][^}]*srcdoc:/],
  ['Module script startup', /<script\s+type=["']module["']\s+src=["']app\.js["']\s*><\/script>/],
];
for (const [label, match] of checks) {
  if (!match.test(label === 'Module script startup' ? html : source)) errors.push(`${label} invariant not found`);
  else console.log(`PASS ${label}`);
}
if (/(?:sandbox|allow)\s*:\s*['"][^'"]*(?:allow-scripts|allow-same-origin)/.test(source)) {
  warnings.push('Some iframe flags permit scripts or same-origin; manually review iframe isolation.');
}
if (/<script(?![^>]*\bsrc=)[^>]*>[\s\S]*?<\/script>/i.test(html)) {
  warnings.push('Inline <script> detected; CSP script-src without unsafe-inline may break it.');
}
if (/<(?:iframe|object|embed)[^>]+(?:src|data)=["']https?:\/\//i.test(html)) {
  warnings.push('External embedded content found in index.html; audit before enforcing frame-src.');
}
if (errors.length) {
  for (const error of errors) console.error(`ERROR ${error}`);
  process.exitCode = 1;
}
for (const warning of warnings) console.warn(`ADVISORY ${warning}`);
console.log(`Rendering boundary audit: ${errors.length} failure(s), ${warnings.length} advisory note(s)`);
