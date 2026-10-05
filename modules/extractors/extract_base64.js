import { module } from './_cat.js';
import { A } from '../../core/registry.js';
import { base64Decode, decodeUtf8 } from '../../core/util.js';

function pyRepr(s) {
  const quote = s.includes("'") && !s.includes('"') ? '"' : "'";
  let out = quote;
  for (const ch of s) {
    const code = ch.codePointAt(0);
    if (ch === '\\') out += '\\\\';
    else if (ch === quote) out += '\\' + quote;
    else if (ch === '\n') out += '\\n';
    else if (ch === '\r') out += '\\r';
    else if (ch === '\t') out += '\\t';
    else if (code < 0x20 || code === 0x7f) out += '\\x' + code.toString(16).padStart(2, '0');
    else out += ch;
  }
  return out + quote;
}

module('Extract Base64 strings', 'Finds plausible Base64 blobs (min length) and optionally shows their decoded form.',
  [A.number('Minimum length', 20, 4), A.boolean('Show decoded preview', false), A.boolean('Unique', true)],
  (t, minlen, decoded, uniq) => {
    const rx = new RegExp(`(?<![A-Za-z0-9+/=])[A-Za-z0-9+/]{${minlen},}={0,2}(?![A-Za-z0-9+/=])`, 'g');
    let res = t.match(rx) || [];
    if (uniq) res = [...new Set(res)];
    if (decoded) {
      return res.map(r => {
        try {
          const dec = decodeUtf8(base64Decode(r)).slice(0, 80);
          return `${r}  ->  ${pyRepr(dec)}`;
        } catch {
          return r;
        }
      }).join('\n');
    }
    return res.join('\n');
  }, { text: true });
