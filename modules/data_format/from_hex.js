import { module } from './_cat.js';
import { A } from '../../core/registry.js';
import { delimRegex } from '../../core/util.js';

export function fromHexCC(t, d = 'Auto') {
  const pieces = d === 'None' ? [t] : t.split(d === 'Auto' ? /[^a-f\d]|0x/gi : delimRegex(d));
  const out = [];
  for (const p of pieces) for (let j = 0; j < p.length; j += 2) out.push(parseInt(p.substr(j, 2), 16));
  return Uint8Array.from(out);
}

module('From Hex', 'Converts hexadecimal text back to bytes. Delimiters, 0x and \\x prefixes are ignored.',
  [A.select('Delimiter', ['Auto', 'Space', 'Comma', 'Semi-colon', 'Colon', 'Line feed', 'CRLF', 'None', 'Percent', '0x', '0x with comma', '\\x'])],
  (t, d) => fromHexCC(t, d), { text: true });
