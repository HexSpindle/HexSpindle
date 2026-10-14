import { module } from './_cat.js';
import { base64Decode, decodeLatin1, bytesToHex } from '../../core/util.js';

// NTLMSSP messages (MS-NLMP): Negotiate (type 1), Challenge (type 2) and Authenticate (type 3).
const FLAGS = [[0x00000001, 'Negotiate Unicode'], [0x00000002, 'Negotiate OEM'], [0x00000004, 'Request Target'], [0x00000010, 'Negotiate Sign'], [0x00000020, 'Negotiate Seal'],
  [0x00000040, 'Negotiate Datagram'], [0x00000080, 'Negotiate Lan Manager Key'], [0x00000200, 'Negotiate NTLM'], [0x00000800, 'Anonymous'], [0x00001000, 'Negotiate OEM Domain Supplied'],
  [0x00002000, 'Negotiate OEM Workstation Supplied'], [0x00008000, 'Negotiate Always Sign'], [0x00010000, 'Target Type Domain'], [0x00020000, 'Target Type Server'],
  [0x00080000, 'Negotiate Extended Session Security'], [0x00100000, 'Negotiate Identify'], [0x00400000, 'Request Non-NT Session Key'], [0x00800000, 'Negotiate Target Info'],
  [0x02000000, 'Version present'], [0x20000000, 'Negotiate 128-bit'], [0x40000000, 'Negotiate Key Exchange'], [0x80000000, 'Negotiate 56-bit']];
const AV_IDS = { 0: 'end of list', 1: 'NetBIOS computer name', 2: 'NetBIOS domain name', 3: 'DNS computer name', 4: 'DNS domain name', 5: 'DNS tree name', 6: 'flags', 7: 'timestamp', 8: 'single host', 9: 'target name', 10: 'channel bindings' };

export function parseNtlm(bytes) {
  if (decodeLatin1(bytes.subarray(0, 7)) !== 'NTLMSSP' || bytes[7] !== 0) throw new Error('Not an NTLM message (no NTLMSSP signature)');
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const type = view.getUint32(8, true);
  const buffer = off => { const len = view.getUint16(off, true), pos = view.getUint32(off + 4, true); return pos + len <= bytes.length ? bytes.subarray(pos, pos + len) : new Uint8Array(0); };
  const str = (b, unicode) => unicode ? decodeLatin1(b).replace(/\0/g, '') ? new TextDecoder('utf-16le').decode(b) : '' : decodeLatin1(b);
  const flagsOf = n => FLAGS.filter(([bit]) => n & bit).map(f => f[1]);
  const version = off => (view.getUint32(12, true) & 0x02000000) && off + 8 <= bytes.length ? `${bytes[off]}.${bytes[off + 1]} build ${view.getUint16(off + 2, true)} (NTLMSSP rev ${bytes[off + 7]})` : null;
  const lines = [`NTLM ${['', 'Negotiate (type 1, client → server)', 'Challenge (type 2, server → client)', 'Authenticate (type 3, client → server)'][type] || `message type ${type}`}`];

  if (type === 1) {
    const flags = view.getUint32(12, true), unicode = !!(flags & 1);
    lines.push(`Flags: 0x${(flags >>> 0).toString(16).padStart(8, '0')}`, ...flagsOf(flags).map(f => `  - ${f}`));
    const domain = str(buffer(16), false), ws = str(buffer(24), false);
    if (domain) lines.push(`Supplied domain: ${domain}`);
    if (ws) lines.push(`Supplied workstation: ${ws}`);
    const v = version(32); if (v) lines.push(`Version: ${v}`);
  } else if (type === 2) {
    const flags = view.getUint32(20, true), unicode = !!(flags & 1);
    lines.push(`Target name: ${str(buffer(12), unicode)}`, `Server challenge: ${bytesToHex(bytes.subarray(24, 32))}`, `Flags: 0x${(flags >>> 0).toString(16).padStart(8, '0')}`, ...flagsOf(flags).map(f => `  - ${f}`));
    const v = version(48); if (v) lines.push(`Version: ${v}`);
    const info = buffer(40);
    if (info.length) {
      lines.push('Target info (AV pairs):');
      const iv = new DataView(info.buffer, info.byteOffset, info.byteLength);
      for (let p = 0; p + 4 <= info.length;) { const id = iv.getUint16(p, true), len = iv.getUint16(p + 2, true); p += 4; if (id === 0) break; const data = info.subarray(p, p + len); p += len;
        lines.push(`  ${AV_IDS[id] || 'id ' + id}: ${id === 7 ? new Date(Number((iv.getBigUint64(p - len, true)) / 10000n) - 11644473600000).toISOString() : id === 6 ? '0x' + bytesToHex(data) : new TextDecoder('utf-16le').decode(data)}`); }
    }
  } else if (type === 3) {
    const flags = bytes.length >= 64 ? view.getUint32(60, true) : 1, unicode = !!(flags & 1);
    const lm = buffer(12), nt = buffer(20), domain = str(buffer(28), unicode), user = str(buffer(36), unicode), ws = str(buffer(44), unicode), key = buffer(52);
    lines.push(`Domain: ${domain}`, `User: ${user}`, `Workstation: ${ws}`, `LM response (${lm.length} bytes): ${bytesToHex(lm) || '(none)'}`, `NT response (${nt.length} bytes): ${bytesToHex(nt.subarray(0, 48))}${nt.length > 48 ? '…' : ''}`);
    // An NT response longer than 24 bytes is NTLMv2; the first 16 bytes are the HMAC, the rest the blob (crackable offline).
    if (nt.length > 24) lines.push(`Authentication: NTLMv2`, `  net-NTLMv2 hash (for offline cracking): ${user}::${domain}:${bytesToHex(bytes.subarray(24, 32)) || '<challenge from the matching type 2>'}:${bytesToHex(nt.subarray(0, 16))}:${bytesToHex(nt.subarray(16))}`);
    else if (nt.length === 24) lines.push('Authentication: NTLMv1 (weak)');
    else if (flags & 0x800) lines.push('Anonymous authentication');
    if (key.length) lines.push(`Encrypted session key: ${bytesToHex(key)}`);
    const v = version(64); if (v) lines.push(`Version: ${v}`);
  } else throw new Error(`Unknown NTLM message type ${type}`);
  return lines.join('\n');
}

module('Parse NTLM Message',
  'Parses NTLM authentication messages (NTLMSSP, as seen in HTTP Authorization/WWW-Authenticate: NTLM headers, SMB and RPC) into readable fields. '
  + 'Decodes the Negotiate (type 1), Challenge (type 2, with the server challenge and AV target info) and Authenticate (type 3, with domain, user, workstation and the LM/NT responses) messages, '
  + 'identifies NTLMv1 versus NTLMv2, and assembles the net-NTLMv2 string used for offline password auditing. Accepts Base64 or hex.',
  [],
  (data) => {
    let bytes = data;
    const text = decodeLatin1(data.subarray(0, Math.min(data.length, 65536))).trim().replace(/^(?:NTLM|Negotiate)\s+/i, '');
    if (/^[A-Za-z0-9+/=\s]+$/.test(text) && text.length >= 12 && decodeLatin1(data.subarray(0, 7)) !== 'NTLMSSP') { try { bytes = base64Decode(text); } catch { /* keep */ } }
    else if (/^[0-9a-fA-F\s]+$/.test(text) && text.replace(/\s/g, '').length >= 24) bytes = Uint8Array.from(text.replace(/\s/g, '').match(/../g), h => parseInt(h, 16));
    return parseNtlm(bytes);
  }, { aliases: ['ntlm', 'ntlmssp', 'net-ntlm', 'ntlmv2'] });
