export function expandAlphabet(s) {
  const out = [];
  let i = 0;
  while (i < s.length) {
    if (i + 2 < s.length && s[i + 1] === '-' && s.charCodeAt(i + 2) >= s.charCodeAt(i)) {
      for (let c = s.charCodeAt(i); c <= s.charCodeAt(i + 2); c++) out.push(String.fromCharCode(c));
      i += 3;
    } else { out.push(s[i]); i++; }
  }
  return out.join('');
}

export const STD64 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=';
export const B64_PRESETS = [
  ['Standard (RFC 4648): A-Za-z0-9+/=', STD64],
  ['URL safe (RFC 4648 §5): A-Za-z0-9-_', expandAlphabet('A-Za-z0-9-_')],
  ['Filename safe: A-Za-z0-9+\\-=', expandAlphabet('A-Za-z0-9+') + '-='],
  ['itoa64 (crypt): ./0-9A-Za-z=', expandAlphabet('./0-9A-Za-z=')],
  ['XML: A-Za-z0-9_.', expandAlphabet('A-Za-z0-9_.')],
  ['y64: A-Za-z0-9._-', expandAlphabet('A-Za-z0-9._-')],
  ['z64: 0-9a-zA-Z+/=', expandAlphabet('0-9a-zA-Z+/=')],
  ['Radix-64 (RFC 4880): 0-9A-Za-z+/=', expandAlphabet('0-9A-Za-z+/=')],
  ['ROT13: N-ZA-Mn-za-m0-9+/=', expandAlphabet('N-ZA-Mn-za-m0-9+/=')],
];

export function resolveAlphabet(s, size) {
  return (s.length === size || s.length === size + 1) && new Set(s).size === s.length ? s : expandAlphabet(s);
}

function alpha(s, size) {
  const a = (s.length === size || s.length === size + 1) && new Set(s).size === s.length ? s : expandAlphabet(s);
  if (a.length < size) throw new Error(`Alphabet must be at least ${size} characters (got ${a.length})`);
  return a;
}

export function b64Encode(u8, alphabet) {
  const a = alpha(alphabet, 64);
  const pad = a.length > 64 ? a[64] : '';
  let bin = '';
  for (const b of u8) bin += b.toString(2).padStart(8, '0');
  let out = '';
  for (let i = 0; i < bin.length; i += 6) {
    const chunk = bin.slice(i, i + 6).padEnd(6, '0');
    out += a[parseInt(chunk, 2)];
  }
  while (out.length % 4) out += pad || '=';
  return pad ? out : out.replace(/=*$/, '');
}

export function b64Decode(t, alphabet, removeNonAlpha = true, strict = false) {
  const a = alpha(alphabet, 64);
  const pad = a.length > 64 ? a[64] : '=';
  if (removeNonAlpha) t = [...t].filter(c => a.includes(c) || c === pad).join('');
  t = t.replace(new RegExp('\\' + pad + '+$'), '');
  let bin = '';
  for (const c of t) { const idx = a.indexOf(c); if (idx >= 0 && idx < 64) bin += idx.toString(2).padStart(6, '0'); else if (strict) throw new Error(`Invalid character for this alphabet: ${c}`); }
  const bytes = [];
  for (let i = 0; i + 8 <= bin.length; i += 8) bytes.push(parseInt(bin.slice(i, i + 8), 2));
  return new Uint8Array(bytes);
}

export function intToBase(n, digits) {
  if (n === 0) return digits[0];
  const base = digits.length;
  let out = '';
  while (n > 0) { out = digits[n % base] + out; n = Math.floor(n / base); }
  return out;
}
