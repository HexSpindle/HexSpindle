#!/usr/bin/env node
// Conservative, dependency-free security invariant checks. Avoid scanning bundled
// vendor JS for regex-based 'secrets': such scans are very prone to false positives.
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { resolve, join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
const root = resolve(fileURLToPath(new URL('..', import.meta.url)));
const errors = [];
const warnings = [];
const fail = message => errors.push(message);
const workflow = readFileSync(join(root, '.github/workflows/hexspindle-ci.yml'), 'utf8');
const html = readFileSync(join(root, 'index.html'), 'utf8');
const has = (re, description) => { if (!re.test(workflow)) fail(description); };
has(/^permissions:\s*\n\s*contents: read\s*$/m, 'Workflow must retain read-only GITHUB_TOKEN permissions');
has(/if:\s*github\.event_name == 'push' && github\.ref == 'refs\/heads\/main'/, 'Deploy job must be restricted to pushes on main');
has(/needs:\s*browser-smoke-test/, 'Deploy must depend on passed smoke tests');
has(/persist-credentials:\s*false/g, 'Checkout should not retain GitHub token');
has(/ssh-key:\s*\$\{\{ secrets\.PAGES_DEPLOY_KEY \}\}/, 'Deployment should use the dedicated SSH deploy key');
has(/rsync -av --delete --exclude='\.git\/'/, 'Deployment should synchronize an allowlisted release artifact');
has(/for directory in assets core modules licenses;/, 'Deployment must have allowlisted directories');
has(/for file in index\.html app\.js app\.css LICENSE THIRD_PARTY_NOTICES\.md/, 'Deployment must have allowlisted root files');
// Avoid an overly broad regex that accidentally flags harmless references to token APIs.
const forbiddenNames = /^(?:\.env(?:\..+)?|id_(?:rsa|ed25519)|.*\.(?:pem|p12|pfx|key)|.*credentials.*\.json|.*secrets?.*\.json)$/i;
const skip = new Set(['.git', 'node_modules', '.next', 'dist', 'build', 'coverage']);
function walk(dir) {
  for (const item of readdirSync(dir, {withFileTypes:true})) {
    if (item.isDirectory()) {
      if (!skip.has(item.name)) walk(join(dir, item.name));
    } else if (item.isFile() && forbiddenNames.test(item.name)) {
      fail(`Potential credential material under tracked source: ${relative(root,join(dir,item.name))}`);
    }
  }
}
walk(root);
// HTML anchors with a literal new-tab target must prevent opener access.
for (const m of html.matchAll(/<a\b[^>]*>/gi)) {
  const anchor = m[0];
  if (!/\btarget\s*=\s*['"]_blank['"]/i.test(anchor)) continue;
  const rel = anchor.match(/\brel\s*=\s*['"]([^'"]*)['"]/i)?.[1] || '';
  if (!/\bnoopener\b/i.test(rel)) fail(`New-tab link is missing rel=noopener: ${anchor.slice(0,140)}`);
}
if (!/<script\s+type=["']module["']\s+src=["']app\.js["']/.test(html)) warnings.push('App script tag has changed; review browser entrypoint.');
console.log(`Security posture: ${errors.length} failures, ${warnings.length} advisory notes`);
for (const warning of warnings) console.warn('WARN: '+warning);
for (const error of errors) console.error('ERROR: '+error);
if (errors.length) process.exitCode = 1;
else console.log('PASS: deployment protections, obvious credential filenames, and static external links');
