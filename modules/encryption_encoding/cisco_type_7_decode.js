import { module } from './_cat.js';

// The fixed translation string every Cisco IOS device uses for "type 7" passwords.
const XLAT = 'dsfd;kfoA,.iyewrkldJKDHSUBsgvca69834ncxv9873254k;fg87';

export function decodeType7(value) {
  const v = value.trim();
  if (!/^\d{2}(?:[0-9A-Fa-f]{2})+$/.test(v)) throw new Error(`Not a type 7 password: ${v.slice(0, 40)}`);
  const seed = parseInt(v.slice(0, 2), 10);
  if (seed > 52) throw new Error(`Not a type 7 password (seed ${seed} is out of range): ${v.slice(0, 40)}`);
  let out = '';
  for (let i = 2, n = 0; i < v.length; i += 2, n++) out += String.fromCharCode(parseInt(v.slice(i, i + 2), 16) ^ XLAT.charCodeAt((seed + n) % XLAT.length));
  return out;
}

module('Cisco Type 7 Decode',
  'Decodes Cisco IOS "type 7" passwords (the reversible obfuscation behind "password 7 …" and "service password-encryption"). '
  + 'Accepts bare values or whole configuration lines, one per line; lines without a type 7 value are passed through unchanged.',
  [],
  (t) => t.split(/\r?\n/).map(line => {
    const m = /^(.*\b7\s+)([0-9A-Fa-f]{6,})\s*$/.exec(line) || /^(\s*)(\d{2}(?:[0-9A-Fa-f]{2})+)\s*$/.exec(line);
    if (!m) return line;
    try { return m[1].trim() ? `${m[1]}${m[2]}  ->  ${decodeType7(m[2])}` : decodeType7(m[2]); } catch { return line; }
  }).join('\n'), { text: true, aliases: ['cisco password 7', 'type 7', 'ios password'] });
