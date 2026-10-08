// SPDX-License-Identifier: MIT
// Optional offline real-artefact oracle tests. No network access at test time.
// Obtain the exact public specimens listed below and preserve filenames/folders.
// Usage: node tools/ci-forensics-public-prefetch.mjs /path/to/TestFiles
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { parsePrefetch } from '../modules/forensics/_windows.js';

const fixtures = [
  { file:'Win10/CMD.EXE-D269B812.pf', blob:'e27575eb106ebe8cd3b4fc3834eb080f8d220314',version:30,compression:'MAM04 XPRESS-Huffman',exe:'CMD.EXE',hash:'0xd269b812',size:25138,runs:55 },
  { file:'Win10/CALC.EXE-3FBEF7FD.pf',blob:'0035fe1b6ed81734b26cfa67dd088ff8fa0a5c5b',version:30,compression:'MAM04 XPRESS-Huffman',exe:'CALC.EXE',hash:'0x3fbef7fd',size:47848,runs:2 },
  { file:'Win10/DCODEDCODEDCODEDCODEDCODEDCOD-E65B9FE8.pf',blob:'0abb2b5fb0506489c079236c435720ef11ed7123',version:30,compression:'MAM04 XPRESS-Huffman',exe:'DCODEDCODEDCODEDCODEDCODEDCOD',hash:'0xe65b9fe8',size:33606,runs:2 },
  { file:'Win8x/CMD.EXE-4A81B364.pf',blob:'eea8bf65e845e36cb47d5f1729d38cc3c7b91959',version:26,compression:'none',exe:'CMD.EXE',hash:'0x4a81b364',size:8108,runs:2 },
];
const base=process.argv[2];
if (!base) { console.error('Missing public sample corpus directory. Usage: node tools/ci-forensics-public-prefetch.mjs /path/to/TestFiles');process.exit(2); }
for (const f of fixtures) {
  const raw=readFileSync(join(base,f.file));
  const githubBlob=createHash('sha1').update(`blob ${raw.length}\0`).update(raw).digest('hex');
  assert.equal(githubBlob,f.blob,`Public source blob changed: ${f.file}`);
  const parsed=JSON.parse(parsePrefetch(new Uint8Array(raw)));
  for (const [field,expected] of [['version',f.version],['compression',f.compression],['executable',f.exe],['hash',f.hash],['fileSize',f.size],['runCount',f.runs]]) {
    assert.equal(parsed[field],expected,`${f.file} ${field}`);
  }
  console.log(`PASS authentic ${f.file}: ${parsed.version}, ${parsed.executable}, ${parsed.runCount} runs`);
}
console.log(`PASS: ${fixtures.length} authentic Prefetch corpus specimens corroborated against published filenames, metadata and Git blob hashes`);
