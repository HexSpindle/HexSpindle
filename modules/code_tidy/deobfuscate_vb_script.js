import { module } from './_cat.js';

// Statically resolves the string obfuscation used in malicious VBA / VBScript macros: Chr() character building,
// string concatenation with &, and StrReverse. No code is run; this only rewrites the source so it can be read.
function fold(code) {
  let s = code;
  // Chr(72), Chr(&H48), ChrW(0x48), ChrB(72) -> "H"  (case-insensitive, VB uses & for concat)
  s = s.replace(/\bChr[WB]?\s*\(\s*(&H[0-9a-f]+|&O[0-7]+|\d+)\s*\)/gi, (whole, n) => {
    const value = /^&H/i.test(n) ? parseInt(n.slice(2), 16) : /^&O/i.test(n) ? parseInt(n.slice(2), 8) : +n;
    return value >= 32 && value < 127 ? `"${value === 34 ? '""' : String.fromCharCode(value)}"` : whole;
  });
  // Adjacent string concatenation: "a" & "b" or "a" + "b" -> "ab" (VB escapes a quote by doubling it).
  for (let i = 0; i < 40; i++) { const next = s.replace(/"((?:""|[^"])*)"\s*[&+]\s*"((?:""|[^"])*)"/g, (_, a, b) => `"${a}${b}"`); if (next === s) break; s = next; }
  // StrReverse("olleh") -> "hello".
  s = s.replace(/\bStrReverse\s*\(\s*"((?:""|[^"])*)"\s*\)/gi, (_, body) => `"${body.replace(/""/g, '\0').split('').reverse().join('').replace(/\0/g, '""')}"`);
  return s;
}

module('Deobfuscate VB Script',
  'Statically simplifies obfuscated VBA / VBScript (the macro language in Office documents and .vbs droppers) to make it readable, without running it. '
  + 'Resolves Chr(), ChrW() and ChrB() character codes (decimal, &H hex and &O octal), joins strings concatenated with & or +, and evaluates StrReverse. '
  + 'A best-effort analysis aid, repeated until stable; review the result.',
  [],
  (t) => {
    let s = t, previous;
    for (let i = 0; i < 20 && s !== previous; i++) { previous = s; s = fold(s); }
    return s;
  }, { text: true, aliases: ['vba', 'vbscript', 'deobfuscate vba', 'macro', 'chr', 'strreverse'] });
