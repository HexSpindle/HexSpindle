import { module } from './_cat.js';
import { base64Decode, decodeUtf8, decodeLatin1, bytesToHex } from '../../core/util.js';

// ASP.NET __VIEWSTATE / __EVENTVALIDATION, serialized by ObjectStateFormatter / LosFormatter.
// A readable (not encrypted) blob begins with the marker 0xFF 0x01. This reports the structure best-effort,
// and always extracts the embedded strings, which is what matters for analysis. It does not deserialize anything.
const TOKENS = { 1: 'Int16', 2: 'Int32', 3: 'Byte', 4: 'Char', 5: 'String', 6: 'DateTime', 7: 'Double', 8: 'Single', 9: 'Color', 10: 'KnownColor', 11: 'IntEnum',
  15: 'Pair', 16: 'Triplet', 20: 'Array', 21: 'StringArray', 22: 'ArrayList', 23: 'Hashtable', 24: 'HybridDictionary', 25: 'Type', 30: 'IndexedStringAdd', 31: 'IndexedString',
  40: 'StringFormatted', 50: 'BinarySerialized', 100: 'Null', 101: 'EmptyString' };
// Type names that appear in __VIEWSTATE deserialization gadget chains (ysoserial.net and related).
const GADGETS = [/LosFormatter/, /ObjectStateFormatter/, /ObjectDataProvider/, /TypeConfuseDelegate/, /ActivitySurrogateSelector/, /TextFormattingRunProperties/, /PSObject/, /DataSet/, /WindowsIdentity/,
  /ClaimsIdentity/, /SessionSecurityToken/, /RolePrincipal/, /System\.Workflow/, /XamlReader/, /ResourceDictionary/, /ObjectDataProvider/, /Process/, /AssemblyName/];

function sevenBitLength(bytes, i) {
  let length = 0, shift = 0, b;
  do { b = bytes[i++]; length |= (b & 0x7f) << shift; shift += 7; } while (b & 0x80);
  return [length, i];
}

export function decodeViewState(bytes) {
  const encrypted = !(bytes[0] === 0xff && bytes[1] === 0x01);
  const lines = [];
  // Every length-prefixed string token, read precisely; this is the reliable, useful part.
  const strings = [];
  for (let i = 2; i < bytes.length - 1;) {
    if (bytes[i] === 0x05 || bytes[i] === 30) {   // String or IndexedStringAdd (defines a string)
      const [len, start] = sevenBitLength(bytes, i + 1);
      if (len > 0 && len <= 0x4000 && start + len <= bytes.length) {
        const s = decodeUtf8(bytes.subarray(start, start + len));
        if (/^[\x09\x0a\x0d\x20-\x7e -￿]*$/.test(s)) { strings.push(s); i = start + len; continue; }
      }
    }
    i++;
  }
  if (encrypted) {
    lines.push('This ViewState does not begin with the FF 01 marker, so it is encrypted (AES, via the machine key) and cannot be read without that key.',
      'Encrypted ViewState also cannot be tampered with offline.', '', `Length: ${bytes.length} bytes`, `First bytes: ${bytesToHex(bytes.subarray(0, 16))}`);
  } else {
    lines.push('ASP.NET ViewState (ObjectStateFormatter), not encrypted.', '');
    // Best-effort token tally gives a feel for the structure without a full typed walk.
    const tally = {};
    for (let i = 2; i < bytes.length; i++) { const name = TOKENS[bytes[i]]; if (name && (bytes[i] === 15 || bytes[i] === 16 || bytes[i] === 22 || bytes[i] === 5 || bytes[i] >= 100)) tally[name] = (tally[name] || 0) + 1; }
    lines.push(`Approximate structure: ${Object.entries(tally).map(([k, v]) => `${v}× ${k}`).join(', ') || '(no common tokens recognised)'}`,
      strings.length ? `\nEmbedded strings (${strings.length}):` : '\nNo readable strings found.',
      ...strings.slice(0, 200).map(s => `  ${JSON.stringify(s.length > 120 ? s.slice(0, 120) + '…' : s)}`));
    if (strings.length > 200) lines.push(`  … and ${strings.length - 200} more`);
  }
  // MAC detection: a trailing 20 (HMAC-SHA1) or 32 (HMAC-SHA256) byte signature is common on legacy ViewState.
  const gadgets = strings.filter(s => GADGETS.some(g => g.test(s)));
  if (gadgets.length) lines.push('', 'WARNING: type names associated with ViewState deserialization gadget chains were found:', ...[...new Set(gadgets)].map(s => `  - ${s}`),
    'If this application accepts ViewState without a valid MAC (or the machine key is known), this may achieve remote code execution. Analyse it; do not replay it against a live system you are not authorised to test.');
  return lines.join('\n');
}

module('Decode ViewState',
  'Decodes an ASP.NET __VIEWSTATE or __EVENTVALIDATION value (ObjectStateFormatter / LosFormatter). Detects whether it is encrypted, shows its approximate structure and extracts all embedded strings — '
  + 'control IDs, event-validation data and any serialized type names. Type names belonging to known ViewState deserialization gadget chains are flagged. Accepts Base64 (optionally URL-encoded) or raw bytes; does not deserialize.',
  [],
  (data) => {
    let bytes = data;
    const text = decodeLatin1(data.subarray(0, Math.min(data.length, 1 << 20))).trim();
    if (!(data[0] === 0xff && data[1] === 0x01)) {
      const b64 = /%[0-9A-Fa-f]{2}/.test(text) ? decodeURIComponent(text) : text;
      if (/^[A-Za-z0-9+/=\s]+$/.test(b64)) { try { bytes = base64Decode(b64.replace(/\s/g, '')); } catch { /* keep raw */ } }
    }
    if (!bytes.length) throw new Error('Empty input');
    return decodeViewState(bytes);
  }, { aliases: ['viewstate', '__viewstate', 'asp.net', 'eventvalidation', 'losformatter'] });
