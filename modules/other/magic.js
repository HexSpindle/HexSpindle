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

module('Magic', 'Speculatively tries many decoders (Base64, hex, gzip, ROT13, ...) and ranks the plausible results. Use it when you don\'t know what the data is.',
  [A.number('Depth', 3, 1, 6), A.boolean('Intensive mode (1-byte XOR brute force)', false), A.string('Crib (regex)', ''), A.number('Show top', 8, 1, 30)],
  async (data, depth, intensive, crib, top) => {
    const res = await search(data, Math.trunc(depth), intensive, crib || null);
    const lines = [];
    for (const { data: out, path, score: sc } of res.slice(0, Math.trunc(top))) {
      const chain = path.map(([n]) => n).join(' → ') || '(input as-is)';
      const snippet = decodeUtf8(out.subarray(0, 70)).replace(/\n/g, '⏎');
      lines.push(`[${sc.toFixed(1).padStart(6)}] ${chain}\n         ${pyRepr(snippet)}`);
    }
    return lines.join('\n');
  });
