import { module } from './_cat.js';

// Rewrites the character-level obfuscations common in malicious JavaScript into plain text, so the script can be
// read. It transforms syntax only (escapes, fromCharCode, concatenation); it never evaluates the script.
function normalise(code) {
  let s = code;
  // String.fromCharCode(72,105) / String.fromCharCode(0x48,0x69) -> "Hi"
  s = s.replace(/String\.fromCharCode\s*\(([^()]*)\)/gi, (whole, nums) => {
    const list = nums.split(',').map(x => x.trim());
    if (!list.every(x => /^(?:0x[0-9a-f]+|\d+)$/i.test(x))) return whole;
    const text = list.map(x => String.fromCharCode(Number(x))).join('');
    return `"${text.replace(/[\\"]/g, '\\$&').replace(/\n/g, '\\n')}"`;
  });
  // \xHH, \uHHHH, \u{...} and octal escapes inside string literals.
  s = s.replace(/\\x([0-9a-f]{2})/gi, (_, h) => escapeForLiteral(String.fromCharCode(parseInt(h, 16))));
  s = s.replace(/\\u\{([0-9a-f]+)\}/gi, (_, h) => escapeForLiteral(String.fromCodePoint(parseInt(h, 16))));
  s = s.replace(/\\u([0-9a-f]{4})/gi, (_, h) => escapeForLiteral(String.fromCharCode(parseInt(h, 16))));
  // Adjacent string-literal concatenation: "a"+"b" -> "ab" (same quote style).
  for (let i = 0; i < 10; i++) { const next = s.replace(/(['"])((?:\\.|(?!\1).)*)\1\s*\+\s*(['"])((?:\\.|(?!\3).)*)\3/g, (_, q, a, __, b) => `${q}${a}${b.replace(new RegExp(q, 'g'), '\\' + q)}${q}`); if (next === s) break; s = next; }
  return s;
}
const escapeForLiteral = ch => { const c = ch.charCodeAt(0); return c === 0x22 ? '\\"' : c === 0x27 ? "\\'" : c === 0x5c ? '\\\\' : c === 0x0a ? '\\n' : c === 0x0d ? '\\r' : c === 0x09 ? '\\t' : c < 0x20 ? '\\x' + c.toString(16).padStart(2, '0') : ch; };

module('Normalise Obfuscated JavaScript',
  'Rewrites character-level JavaScript obfuscation into readable text: resolves String.fromCharCode(...) calls, \\xHH, \\uHHHH and \\u{…} escapes, and joins concatenated string literals ("a"+"b"). '
  + 'It only rewrites syntax and never runs the script, so it is safe on untrusted code. Useful before reading a dropper or a packed payload; follow with JavaScript Beautify.',
  [],
  (t) => normalise(t), { text: true, aliases: ['deobfuscate javascript', 'fromcharcode', 'unescape javascript', 'normalize javascript'] });
