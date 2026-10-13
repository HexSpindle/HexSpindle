#!/usr/bin/env node
// SPDX-License-Identifier: MIT
// Behaviour tests for the line-oriented text utilities (modules/utils): each case runs the operation through
// the engine with the given arguments (omitted arguments take their defaults) and compares the exact output.
import '../modules/index.js';
import { MODULES } from '../core/registry.js';
import { callModule, resolveArgs } from '../core/engine.js';

const enc = new TextEncoder(), dec = new TextDecoder();
const run = async (name, input, args = []) => {
  const mod = MODULES[name];
  if (!mod) throw new Error(`Missing operation: ${name}`);
  return dec.decode((await callModule(mod, enc.encode(input), resolveArgs(mod, args, new Map())))[0]);
};

// [operation, what is being checked, input, arguments, expected output]
const CASES = [
  ['Deduplicate lines', 'keeps the first occurrence and leaves empty lines alone', 'a\nb\na\n\nb\n\nc', [], 'a\nb\n\n\nc'],
  ['Deduplicate lines', 'can treat empty lines as duplicates too', 'a\n\nb\n\na', [true, false, 'First occurrence', 'All lines', false], 'a\n\nb'],
  ['Deduplicate lines', 'case-insensitive comparison keeps the first spelling', 'Apple\napple\nAPPLE\nbanana', [false], 'Apple\nbanana'],
  ['Deduplicate lines', 'can ignore surrounding whitespace', ' x \nx\ny', [true, true], ' x \ny'],
  ['Deduplicate lines', 'keeps the last occurrence in its own position', 'a\nb\na\nc', [true, false, 'Last occurrence'], 'b\na\nc'],
  ['Deduplicate lines', 'adjacent mode only merges neighbouring repeats', 'a\na\nb\na\na\na', [true, false, 'First occurrence', 'Adjacent lines only'], 'a\nb\na'],
  ['Deduplicate lines', 'adjacent mode can keep the last of a run', 'A\na\nb', [false, false, 'Last occurrence', 'Adjacent lines only'], 'a\nb'],
  ['Deduplicate lines', 'preserves CRLF line endings', 'a\r\nb\r\na', [], 'a\r\nb'],

  ['Remove empty lines', 'removes empty and whitespace-only lines', 'a\n\n  \nb\n\n', [], 'a\nb'],
  ['Remove empty lines', 'can keep whitespace-only lines', 'a\n\n  \nb', ['Remove all empty lines', false], 'a\n  \nb'],
  ['Remove empty lines', 'collapses runs of empty lines into one', 'a\n\n\n\nb\n\nc', ['Collapse runs of empty lines into one'], 'a\n\nb\n\nc'],
  ['Remove empty lines', 'trims empty lines at the start and end only', '\n\n a\n\nb\n\n', ['Only at the start and end'], ' a\n\nb'],
  ['Remove empty lines', 'preserves CRLF line endings', 'a\r\n\r\nb', [], 'a\r\nb'],

  ['Trim lines', 'trims both ends of every line', '  a  \n\tb\t\n c', [], 'a\nb\nc'],
  ['Trim lines', 'can trim the start only', '  a  ', ['Start'], 'a  '],
  ['Trim lines', 'can trim the end only', '  a  ', ['End'], '  a'],
  ['Trim lines', 'trims a custom set of characters', '--a--\n==b==', ['Both ends', '-='], 'a\nb'],
  ['Trim lines', 'custom characters may be regex-special', ']^x^]', ['Both ends', ']^'], 'x'],
  ['Trim lines', 'collapses inner runs of spaces and tabs', '  a   b\t\tc  ', ['Both ends', '', true], 'a b c'],

  ['Convert line endings', 'normalises a mix of endings to LF', 'a\r\nb\nc\rd', [], 'a\nb\nc\nd'],
  ['Convert line endings', 'converts to CRLF without doubling existing ones', 'a\nb\r\nc', ['CRLF (Windows)'], 'a\r\nb\r\nc'],
  ['Convert line endings', 'converts to CR', 'a\nb', ['CR (classic Mac)'], 'a\rb'],

  ['Cut fields', 'keeps one column', 'a,b,c\nd,e,f', [',', '2'], 'b\ne'],
  ['Cut fields', 'outputs fields in the order listed', '1,2,3,4', [',', '3-4,1'], '3,4,1'],
  ['Cut fields', 'accepts an escaped tab and a different output delimiter', 'a\tb\tc', ['\\t', '1,3', ' | '], 'a | c'],
  ['Cut fields', 'selects the last field', 'x:y:z', [':', '-1'], 'z'],
  ['Cut fields', 'supports an open-ended range', 'a b c d', [' ', '2-'], 'b c d'],
  ['Cut fields', 'passes through lines without the delimiter', 'a,b\nplain', [',', '1'], 'a\nplain'],
  ['Cut fields', 'can drop lines without the delimiter', 'a,b\nplain', [',', '1', '', true], 'a'],
  ['Cut fields', 'ignores fields that do not exist', 'a,b', [',', '5'], ''],

  ['Select lines', 'keeps a range of lines', 'l1\nl2\nl3\nl4\nl5', ['2-4'], 'l2\nl3\nl4'],
  ['Select lines', 'keeps the last lines', 'l1\nl2\nl3\nl4\nl5', ['-2'], 'l4\nl5'],
  ['Select lines', 'keeps lines in the order listed', 'l1\nl2\nl3\nl4\nl5', ['1,5,3'], 'l1\nl5\nl3'],
  ['Select lines', 'can remove the listed lines instead', 'l1\nl2\nl3\nl4\nl5', ['2-4', true], 'l1\nl5'],
  ['Select lines', 'supports an open-ended range', 'l1\nl2\nl3\nl4\nl5', ['4-'], 'l4\nl5'],

  ['Add prefix / suffix to lines', 'quotes every line', 'a\nb', ["'", "',"], "'a',\n'b',"],
  ['Add prefix / suffix to lines', 'skips empty lines by default', 'a\n\nb', ['> ', ''], '> a\n\n> b'],
  ['Add prefix / suffix to lines', 'can decorate empty lines too', 'a\n\nb', ['> ', '', false], '> a\n> \n> b'],
  ['Add prefix / suffix to lines', 'understands escapes', 'a', ['\\t', '\\n'], '\ta\n'],

  ['Remove non-printable characters', 'removes control characters but keeps tabs and line breaks', 'a\x00b\x07c\td\n', [], 'abc\td\n'],
  ['Remove non-printable characters', 'removes zero-width spaces, BOM and bidi overrides', '﻿he​llo‮', [], 'hello'],
  ['Remove non-printable characters', 'leaves zero-width non-joiners in Persian text by default', 'می‌روم', [], 'می‌روم'],
  ['Remove non-printable characters', 'removes joiners when asked', 'می‌روم', ['Control characters (keep tabs and line breaks)', true, true], 'میروم'],
  ['Remove non-printable characters', 'can replace tabs and line breaks too', 'a\tb\nc', ['Control characters, tabs and line breaks', false, false, ' '], 'a b c'],
  ['Remove non-printable characters', 'can reduce text to printable ASCII', 'naïve café ✓', ['Everything outside printable ASCII', false, false, '?'], 'na?ve caf? ?'],
  ['Remove non-printable characters', 'uses the replacement literally', 'a\x00b', ['Control characters (keep tabs and line breaks)', true, false, '$&'], 'a$&b'],
];

let passed = 0;
const failures = [];
for (const [name, what, input, args, expected] of CASES) {
  try {
    const actual = await run(name, input, args);
    if (actual === expected) passed++;
    else failures.push(`${name}: ${what}: expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`);
  } catch (e) { failures.push(`${name}: ${what}: ${e.message}`); }
}

// Invalid selections must be reported, not silently ignored.
for (const [name, args] of [['Cut fields', [',', 'two']], ['Select lines', ['1..3']], ['Cut fields', ['', '1']]]) {
  try { await run(name, 'a,b\nc,d', args); failures.push(`${name}: accepted invalid arguments ${JSON.stringify(args)}`); }
  catch { passed++; }
}

// Every new operation must be findable by the names people actually type.
const SEARCH = { dedup: 'Deduplicate lines', uniq: 'Deduplicate lines', 'blank lines': 'Remove empty lines', strip: 'Trim lines', crlf: 'Convert line endings', dos2unix: 'Convert line endings',
  cut: 'Cut fields', column: 'Cut fields', 'line range': 'Select lines', prepend: 'Add prefix / suffix to lines', 'zero-width': 'Remove non-printable characters', join: 'Split' };
for (const [alias, name] of Object.entries(SEARCH)) {
  if (MODULES[name]?.category === 'utils' && MODULES[name].aliases.includes(alias)) passed++;
  else failures.push(`"${alias}" should find ${name}`);
}

for (const f of failures) console.error(`FAIL ${f}`);
console.log(`Text utilities: ${passed}/${passed + failures.length} checks passed`);
if (failures.length) process.exitCode = 1;
