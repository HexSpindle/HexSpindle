import { module } from './_cat.js';
import { A } from '../../core/registry.js';
import { search } from '../../core/magic.js';
import { decodeUtf8 } from '../../core/util.js';

function pyRepr(s) {
  const hasSingle = s.includes("'"), hasDouble = s.includes('"');
  const quote = hasSingle && !hasDouble ? '"' : "'";
  let out = quote;
  for (const ch of s) {
    if (ch === '\\') out += '\\\\';
    else if (ch === quote) out += '\\' + quote;
    else if (ch === '\n') out += '\\n';
    else if (ch === '\r') out += '\\r';
    else if (ch === '\t') out += '\\t';
    else out += ch;
  }
  return out + quote;
}

// One byte per character when every character fits in a byte, otherwise UTF-8.
function strToBytes(s) {
  const out = new Uint8Array(s.length);
  for (let i = 0; i < s.length; i++) {
    const c = s.charCodeAt(i);
    if (c > 255) return new TextEncoder().encode(s);
    out[i] = c;
  }
  return out;
}

let ccMagicPromise = null;

module('Magic', 'Detects properties of the input and suggests operations that could help make sense of it, recursively, ranked (byte-frequency language scores, valid UTF-8, file type, entropy, recipe length). By default the output is the full option list as JSON; "Ranked list" gives HexSpindle\'s compact scored list instead.',
  [A.number('Depth', 3, 1, 6), A.boolean('Intensive mode (1-byte XOR brute force)', false), A.string('Crib (regex)', ''), A.number('Show top', 8, 1, 30),
    A.boolean('Extensive language support', false), A.select('Output', ['Options (JSON)', 'Ranked list'])],
  async (data, depth, intensive, crib, top, extLang = false, output = 'Options (JSON)') => {
    if (output === 'Ranked list') {
      const res = await search(data, Math.trunc(depth), intensive, crib || null);
      const lines = [];
      for (const { data: out, path, score: sc } of res.slice(0, Math.trunc(top))) {
        const chain = path.map(([n]) => n).join(' → ') || '(input as-is)';
        const snippet = decodeUtf8(out.subarray(0, 70)).replace(/\n/g, '⏎');
        lines.push(`[${sc.toFixed(1).padStart(6)}] ${chain}\n         ${pyRepr(snippet)}`);
      }
      return lines.join('\n');
    }
    if (!ccMagicPromise) ccMagicPromise = import('./_magic_lib.mjs').then(m => m.MagicLib);
    const MagicLib = await ccMagicPromise;
    const buf = data.buffer.slice(data.byteOffset, data.byteOffset + data.byteLength);
    const cribRegex = crib && crib.length ? new RegExp(crib, 'i') : null;
    let options = await new MagicLib(buf).speculativeExecution(depth, extLang, intensive, [], false, cribRegex);
    if (cribRegex) options = options.filter(o => o.matchesCrib);
    return strToBytes(JSON.stringify(options, null, 4));
  });
