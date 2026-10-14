import { module } from './_cat.js';

// Resolves the "string array" obfuscation produced by obfuscator.io and similar tools, where literals are moved
// into one array and referenced by index (_0xabc[0x3]). It substitutes those references with the literal values.
// A common variant rotates the array and wraps access in a decoder function; this handles the direct-reference form
// and the simple decoder(index) form with a numeric offset. Everything is done by text rewriting, not evaluation.
function parseArrayLiteral(text) {
  const out = []; let i = 0;
  const ws = () => { while (/\s/.test(text[i])) i++; };
  ws(); if (text[i] !== '[') return null; i++;
  for (;;) {
    ws();
    if (text[i] === ']') { i++; return { values: out, end: i }; }
    const q = text[i];
    if (q !== '"' && q !== "'") return null;
    i++; let s = '';
    while (i < text.length && text[i] !== q) { if (text[i] === '\\') { s += text[i] + text[i + 1]; i += 2; } else s += text[i++]; }
    i++; out.push(s);
    ws(); if (text[i] === ',') i++; else if (text[i] !== ']') return null;
  }
}

export function decodeStringArray(code) {
  // Find: var NAME = ['...','...', ...];
  const decl = /(?:var|let|const)\s+(_?0x[0-9a-f]+|\w+)\s*=\s*(\[)/i.exec(code);
  if (!decl) throw new Error('No string array declaration (var NAME = [\'…\', …]) found');
  const name = decl[1];
  const parsed = parseArrayLiteral(code.slice(decl.index + decl[0].length - 1));
  if (!parsed) throw new Error('The array after the declaration could not be parsed');
  const arr = parsed.values;
  const literal = i => `'${arr[i].replace(/\\'/g, "'").replace(/'/g, "\\'")}'`;
  let out = code;
  // Detect a decoder function: function dec(a,b){ return NAME[a - OFFSET]; } and substitute dec(i) too.
  const esc = s => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  let resolved = 0;
  const decoder = new RegExp(`function\\s+(_?0x[0-9a-f]+|\\w+)\\s*\\([^)]*\\)\\s*\\{[^}]*?${esc(name)}\\s*\\[\\s*\\w+\\s*(?:-\\s*(0x[0-9a-f]+|\\d+))?\\s*\\][^}]*\\}`, 'i').exec(code);
  if (decoder) {
    const dname = decoder[1], offset = decoder[2] ? Number(decoder[2]) : 0;
    out = out.replace(new RegExp(`\\b${esc(dname)}\\s*\\(\\s*(0x[0-9a-f]+|\\d+)\\s*\\)`, 'gi'), (whole, idx) => { const i = Number(idx) - offset; if (i >= 0 && i < arr.length) { resolved++; return literal(i); } return whole; });
  }
  // Direct references: NAME[0x3] or NAME[5].
  out = out.replace(new RegExp(`\\b${esc(name)}\\s*\\[\\s*(0x[0-9a-f]+|\\d+)\\s*\\]`, 'gi'), (whole, idx) => { const i = Number(idx); if (i >= 0 && i < arr.length) { resolved++; return literal(i); } return whole; });
  if (!resolved) throw new Error(`Found the array "${name}" (${arr.length} entries) but no index references to resolve`);
  return `// Resolved ${resolved} reference(s) into the ${arr.length}-entry array "${name}".\n` + out;
}

module('Decode JavaScript String Array',
  'Resolves the "string array" obfuscation (obfuscator.io and similar), where string and identifier literals are collected into one array and referenced by index, such as _0xabc[0x3]. '
  + 'It substitutes each index reference, and the simple decoder-function form with a numeric offset, back to the literal value. Works by text rewriting only, so it is safe on untrusted code; '
  + 'it does not handle rotated arrays or VM-based obfuscation. Follow with JavaScript Beautify.',
  [],
  (t) => decodeStringArray(t), { text: true, aliases: ['obfuscator.io', 'deobfuscate javascript', 'string array', '_0x'] });
