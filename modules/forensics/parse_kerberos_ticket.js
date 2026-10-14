import { module } from './_cat.js';
import { decodeLatin1, base64Decode, bytesToHex } from '../../core/util.js';
import { parseOneDer } from '../public_key/_asn1.js';

const ETYPES = { 0: 'none (not encrypted)', 1: 'des-cbc-crc', 3: 'des-cbc-md5', 16: 'des3-cbc-sha1', 17: 'aes128-cts-hmac-sha1-96', 18: 'aes256-cts-hmac-sha1-96', 19: 'aes128-cts-hmac-sha256-128',
  20: 'aes256-cts-hmac-sha384-192', 23: 'rc4-hmac', 24: 'rc4-hmac-exp' };
const NAME_TYPES = { 0: 'unknown', 1: 'principal', 2: 'service and instance', 3: 'service and host', 10: 'enterprise', 11: 'well-known' };
const FLAGS = [[0x40000000, 'forwardable'], [0x20000000, 'forwarded'], [0x10000000, 'proxiable'], [0x08000000, 'proxy'], [0x04000000, 'may-postdate'], [0x02000000, 'postdated'], [0x01000000, 'invalid'],
  [0x00800000, 'renewable'], [0x00400000, 'initial'], [0x00200000, 'pre-authenticated'], [0x00100000, 'hardware-authenticated'], [0x00080000, 'transited-policy-checked'], [0x00040000, 'ok-as-delegate'],
  [0x00010000, 'name-canonicalize']];
const etype = n => `${n} (${ETYPES[n] || 'unknown'})`;
const flags = n => `0x${(n >>> 0).toString(16).padStart(8, '0')}${FLAGS.filter(([bit]) => n & bit).length ? ' (' + FLAGS.filter(([bit]) => n & bit).map(f => f[1]).join(', ') + ')' : ''}`;
const when = seconds => seconds ? new Date(seconds * 1000).toISOString().replace('.000', '') : 'not set';

// What a reader usually wants to know first: is this a TGT, and is anything about it unusual.
function notes(c) {
  const out = [];
  if (/^krbtgt\//i.test(c.server)) out.push('The service is krbtgt: this is a ticket-granting ticket (TGT).');
  if (c.ticketEtype === 23 || c.keyType === 23) out.push('RC4 (etype 23) is in use: weak, and what Kerberoasting and overpass-the-hash rely on.');
  if (c.start && c.end && c.end - c.start > 7 * 86400) out.push(`Lifetime is ${Math.round((c.end - c.start) / 86400)} days; domain policy is normally 10 hours. Very long lifetimes are typical of forged (golden or silver) tickets.`);
  if (c.flagBits !== undefined && c.flagBits & 0x00040000) out.push('ok-as-delegate is set: the service is trusted for delegation.');
  return out;
}
function report(c, n) {
  const lines = [`Credential ${n}`, `  Client:        ${c.client}`, `  Service:       ${c.server}`];
  if (c.keyType !== undefined) lines.push(`  Session key:   etype ${etype(c.keyType)}${c.key ? `, ${bytesToHex(c.key)}` : ''}`);
  if (c.flagBits !== undefined) lines.push(`  Flags:         ${flags(c.flagBits)}`);
  if (c.auth !== undefined) lines.push(`  Authenticated: ${when(c.auth)}`, `  Valid from:    ${when(c.start)}`, `  Expires:       ${when(c.end)}`, `  Renew until:   ${when(c.renew)}`);
  if (c.ticketEtype !== undefined) lines.push(`  Ticket:        encrypted with etype ${etype(c.ticketEtype)}${c.kvno !== undefined ? `, key version ${c.kvno}` : ''}, ${c.cipherLength} bytes of ciphertext`);
  for (const note of notes(c)) lines.push(`  Note: ${note}`);
  return lines.join('\n');
}

// ---- ASN.1 (kirbi / KRB-CRED) ---------------------------------------------------------------------
const field = (seq, n) => { const f = seq.children.find(c => c.class === 2 && c.tag === n); return f ? f.children[0] : null; };
const int = node => node ? node.value.reduce((a, b) => a * 256 + b, 0) : undefined;
const text = node => node ? decodeLatin1(node.value) : '';
const principal = (name, realm) => name ? `${name.children.find(c => c.tag === 1 && c.class === 2).children[0].children.map(text).join('/')}@${text(realm)}` : `@${text(realm)}`;
const time = node => { if (!node) return 0; const m = /^(\d{4})(\d\d)(\d\d)(\d\d)(\d\d)(\d\d)Z$/.exec(text(node)); return m ? Date.UTC(+m[1], +m[2] - 1, +m[3], +m[4], +m[5], +m[6]) / 1000 : 0; };
function ticketInfo(ticket) {
  const seq = ticket.children[0], enc = field(seq, 3);
  return { server: principal(field(seq, 2), field(seq, 1)), ticketEtype: int(field(enc, 0)), kvno: int(field(enc, 1)), cipherLength: field(enc, 2).value.length };
}
function parseKirbi(bytes) {
  const top = parseOneDer(bytes);
  if (top.class !== 1 || top.tag !== 22) throw new Error('Not a KRB-CRED message');
  const cred = top.children[0], tickets = field(cred, 2).children.map(ticketInfo), enc = field(cred, 3);
  const lines = [`Kerberos KRB-CRED (.kirbi), ${tickets.length} ticket${tickets.length === 1 ? '' : 's'}`];
  let info = [];
  if (int(field(enc, 0)) === 0) {
    // Tools export the credential part unencrypted, so the session key and times are readable.
    const part = parseOneDer(field(enc, 2).value).children[0];
    info = field(part, 0).children.map(k => ({ keyType: int(field(field(k, 0), 0)), key: field(field(k, 0), 1).value, client: principal(field(k, 2), field(k, 1)),
      flagBits: field(k, 3) ? field(k, 3).value.slice(1).reduce((a, b) => (a * 256 + b) >>> 0, 0) : undefined, auth: time(field(k, 4)), start: time(field(k, 5)), end: time(field(k, 6)), renew: time(field(k, 7)) }));
  } else lines.push(`The credential part is encrypted (etype ${etype(int(field(enc, 0)))}), so only the ticket itself can be described.`);
  tickets.forEach((t, i) => lines.push('', report({ client: '(not stated)', ...info[i], ...t }, i + 1)));
  return lines.join('\n');
}

// ---- Credential cache (ccache) -------------------------------------------------------------------
function parseCcache(bytes) {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength), version = bytes[1];
  if (version !== 3 && version !== 4) throw new Error(`Credential cache version ${version} is not supported (3 and 4 are)`);
  let at = 2;
  const u8 = () => bytes[at++], u16 = () => { at += 2; return view.getUint16(at - 2); }, u32 = () => { at += 4; return view.getUint32(at - 4); };
  const data = () => { const n = u32(); if (at + n > bytes.length) throw new Error('Credential cache is truncated'); at += n; return bytes.subarray(at - n, at); };
  const princ = () => { const type = u32(), count = u32(), realm = decodeLatin1(data()), parts = []; for (let i = 0; i < count; i++) parts.push(decodeLatin1(data())); return { type, name: `${parts.join('/')}@${realm}` }; };
  if (version === 4) at += 2 + view.getUint16(2);   // header tags (time offset)
  const owner = princ();
  const lines = [`Kerberos credential cache (ccache), format version ${version}`, `Default principal: ${owner.name} (${NAME_TYPES[owner.type] || 'type ' + owner.type})`];
  let n = 0;
  while (at < bytes.length) {
    const client = princ(), server = princ(), keyType = u16();
    if (version === 3) u16();
    const key = data(), auth = u32(), start = u32(), end = u32(), renew = u32();
    u8();   // is_skey
    const flagBits = u32();
    for (let i = u32(); i > 0; i--) { u16(); data(); }   // addresses
    for (let i = u32(); i > 0; i--) { u16(); data(); }   // authorization data
    const ticket = data(); data();                       // ticket, second ticket
    // Configuration entries (X-CACHECONF:) carry settings, not tickets.
    if (/^krb5_ccache_conf_data\//.test(server.name)) continue;
    let extra = {};
    try { extra = ticketInfo(parseOneDer(ticket)); } catch { extra = { cipherLength: ticket.length }; }
    lines.push('', report({ client: client.name, keyType, key, auth, start, end, renew, flagBits, ...extra, server: server.name }, ++n));
  }
  if (!n) lines.push('', 'The cache holds no tickets.');
  return lines.join('\n');
}

module('Parse Kerberos Ticket',
  'Reads Kerberos tickets exported by tools: a .kirbi file (KRB-CRED, as written by Rubeus and mimikatz, raw or Base64) or a credential cache (ccache, as used by MIT Kerberos, klist and impacket). '
  + 'Shows each ticket\'s client, service, session key, encryption type, flags and lifetime, and points out ticket-granting tickets, RC4 encryption and abnormally long lifetimes.',
  [],
  (data) => {
    let bytes = data;
    // Base64 text is how these are usually pasted between tools.
    const asText = decodeLatin1(data.subarray(0, Math.min(data.length, 1 << 20))).trim();
    if (/^[A-Za-z0-9+/=\s]+$/.test(asText) && asText.length >= 16) bytes = base64Decode(asText);
    if (bytes[0] === 0x76) return parseKirbi(bytes);
    if (bytes[0] === 0x05 && (bytes[1] === 3 || bytes[1] === 4)) return parseCcache(bytes);
    throw new Error('Not a .kirbi (KRB-CRED) or ccache file');
  }, { aliases: ['kirbi', 'ccache', 'krb-cred', 'tgt', 'kerberos', 'rubeus', 'klist'] });
