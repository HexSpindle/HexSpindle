#!/usr/bin/env node
// Advisory, offline-only Content Security Policy compatibility inventory.
// Does not inject or enforce a CSP. Reports documented source-level capabilities.
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, resolve, relative, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const skips = new Set(['.git', 'node_modules', 'tools', 'licenses', 'assets']);
const extensions = new Set(['.js', '.mjs', '.html']);
const files = [];
function walk(dir) {
  for (const ent of readdirSync(dir, { withFileTypes: true })) {
    if (ent.isDirectory()) {
      if (!skips.has(ent.name)) walk(join(dir, ent.name));
    } else if (ent.isFile() && extensions.has(ent.name.slice(ent.name.lastIndexOf('.'))) && statSync(join(dir, ent.name)).size < 250_000) {
      files.push(join(dir, ent.name));
    }
  }
}
walk(root);
const findings = new Map();
const tests = [
  ['network APIs (fetch / XHR)', /\bfetch\s*\(|\bXMLHttpRequest\b/g],
  ['WebSocket or EventSource', /\b(?:WebSocket|EventSource)\s*\(/g],
  ['worker creation', /\b(?:Worker|SharedWorker)\s*\(/g],
  ['blob URL generation', /\bURL\.createObjectURL\s*\(/g],
  ['HTML iframe srcdoc', /\bsrcdoc\s*:/g],
  ['inline HTML event handlers', /\bon(?:click|load|error|mouseover)\s*=\s*["']/gi],
  ['dynamic JavaScript evaluation', /\b(?:eval|Function)\s*\(/g],
  ['WebAssembly runtime', /\bWebAssembly\b/g],
  ['external URL literals', /https:\/\/[A-Za-z0-9._-]+\.[A-Za-z]{2,}[\w/?#=.%-]*/g],
];
for (const file of files) {
  const source = readFileSync(file, 'utf8');
  const name = relative(root, file).replaceAll('\\', '/');
  for (const [label, regex] of tests) {
    regex.lastIndex = 0;
    const count = [...source.matchAll(regex)].length;
    if (count) {
      if (!findings.has(label)) findings.set(label, []);
      findings.get(label).push([name, count]);
    }
  }
}
console.log(`CSP compatibility inventory: scanned ${files.length} first-party JS/HTML files`);
for (const [label, hits] of findings) {
  const total = hits.reduce((n, x) => n + x[1], 0);
  console.log(`ADVISORY ${label}: ${total} lexical match(es) in ${hits.length} file(s)`);
  for (const [file, count] of hits.slice(0, 4)) console.log(`  ${file}: ${count}`);
}
const index = readFileSync(join(root, 'index.html'), 'utf8');
if (/<meta\s+[^>]*http-equiv\s*=\s*["']Content-Security-Policy["']/i.test(index)) {
  console.log('NOTE Existing meta CSP detected; verify against all network-enabled operations.');
} else {
  console.log('NOTE No enforcing CSP in index.html; this is an audit only.');
}
console.log('NOTE GitHub Pages does not interpret _headers as HTTP headers; frame-ancestors and report-only require host-level headers.');
console.log('PASS advisory CSP capability inventory complete (not an enforcement or vulnerability test).');
