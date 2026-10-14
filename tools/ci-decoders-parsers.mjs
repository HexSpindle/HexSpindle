#!/usr/bin/env node
// SPDX-License-Identifier: MIT
// Tests for the credential decoders, log and protocol parsers, script deobfuscators, document triage,
// structured-data converters, serialised-object inspectors and Windows identifier operations.
// Expected values come from independent implementations or published examples wherever one exists
// (noted per group); a case passes when the output equals a string, matches a pattern, or satisfies a check.
import '../modules/index.js';
import { readFileSync } from 'node:fs';
import { generateKeyPairSync } from 'node:crypto';
import { MODULES } from '../core/registry.js';
import { callModule, resolveArgs } from '../core/engine.js';
import { derTLV, derSequence } from '../modules/public_key/_asn1.js';

const enc = new TextEncoder(), dec = new TextDecoder();
export const bytes = (...parts) => {
  const chunks = parts.map(p => typeof p === 'string' ? Uint8Array.from(p, c => c.charCodeAt(0) & 255) : p instanceof Uint8Array ? p : Uint8Array.from(p));
  const out = new Uint8Array(chunks.reduce((n, c) => n + c.length, 0));
  let at = 0; for (const c of chunks) { out.set(c, at); at += c.length; }
  return out;
};
export const hex = s => Uint8Array.from(s.replace(/\s+/g, '').match(/../g) || [], h => parseInt(h, 16));
export const b64 = s => Uint8Array.from(atob(s), c => c.charCodeAt(0));
export const run = async (name, input, args = []) => {
  const mod = MODULES[name];
  if (!mod) throw new Error(`Missing operation: ${name}`);
  const [out] = await callModule(mod, typeof input === 'string' ? enc.encode(input) : input, resolveArgs(mod, args, new Map()));
  return out;
};

const CASES = [];
// expect: exact string, RegExp, array of substrings that must all appear, or (text, bytes) => boolean
const test = (op, label, input, args, expect) => CASES.push({ op, label, input, args, expect });
const fails = (op, label, input, args = []) => CASES.push({ op, label, input, args, expect: null });

// ---- Known-key credential decoders ---------------------------------------------------------------
// Cisco: published examples. Juniper: ciphertexts checked with the public junosdecode reference decoder.
// VNC and Group Policy: computed with PyCryptodome; the first cpassword is the widely published example.
test('Cisco Type 7 Decode', 'published example', '0822455D0A16', [], 'cisco');
test('Cisco Type 7 Decode', 'second published example', '02050D480809', [], 'cisco');
test('Cisco Type 7 Decode', 'configuration lines keep their context', 'hostname r1\nenable password 7 0822455D0A16\n!', [], 'hostname r1\nenable password 7 0822455D0A16  ->  cisco\n!');
test('Juniper Type 9 Decode', 'short secret', '$9$HkPQn6A', [], 'lc');
test('Juniper Type 9 Decode', 'typical password', '$9$BbTRcl8X-24ZKM4ZUjPf1RhSKMLxNbYg', [], 'juniper123');
test('Juniper Type 9 Decode', 'symbols', '$9$0vDfIyeN-waZjs2ZjkqzFcyrlWL7-V4JGhc', [], 'Winter2026!');
test('Juniper Type 9 Decode', 'long secret with spaces', '$9$WQtLX-dVw4aU7-UHmfn6p0BRyKvM87dsBIclvM-d24aJi.9CtpuO69IcSrLXs24oaZjHmPT3-VYoJGq.O1REhSMWLXxNylGikP3n9ApBEyN-wgaUhclKMWx7', [], 'a longer secret, with spaces & symbols #1');
test('Juniper Type 9 Decode', 'inside a configuration line', 'set system root-authentication encrypted-password "$9$HkPQn6A"', [], 'set system root-authentication encrypted-password "lc"');
fails('Juniper Type 9 Decode', 'input without a $9$ value', 'no secret here');
test('Group Policy cpassword Decrypt', 'published example', 'j1Uyj3Vx8TY9LtLZil2uAuZkFQA/4latT76ZwgdHdhw', [], 'Local*P4ssword!');
test('Group Policy cpassword Decrypt', 'second vector', 'DFo58CwlYMizGqNu0IyQQGnnoGIgMPfbGlQ6k7eyaXg', [], 'Summer2026!svc');
test('Group Policy cpassword Decrypt', 'Groups.xml names the account', '<Groups><User name="adm"><Properties action="U" newName="" cpassword="j1Uyj3Vx8TY9LtLZil2uAuZkFQA/4latT76ZwgdHdhw" userName="LocalAdmin"/></User></Groups>', [], 'LocalAdmin: Local*P4ssword!');
fails('Group Policy cpassword Decrypt', 'text that is not a cpassword', 'this is not base64!');
test('VNC Password Decrypt', 'eight-character password', '50ccb2fc99726c7f', [], 'Secret12');
test('VNC Password Decrypt', 'shorter password is NUL padded', 'CD95697486CDADAE', [], 'vncpass');
test('VNC Password Decrypt', 'registry and ini forms, one per line', '"Password"=hex:9c,0a,17,2d,34,82,e1,22\nPassword=50ccb2fc99726c7f', [], 'abc\nSecret12');
fails('VNC Password Decrypt', 'too short', '50ccb2');

// ---- Structured data ---------------------------------------------------------------------------------
// TOML is compared with what Python's tomllib (the reference parser) returns for the same document.
const J = t => JSON.stringify(JSON.parse(t));
const fixture = name => readFileSync(new URL(`./fixtures/formats/${name}`, import.meta.url), 'utf8');
const toml = JSON.parse(fixture('toml-reference.json'));
test('XML to JSON', 'attributes, repeated and empty elements', '<a x="1"><b>t</b><b>u</b><c/></a>', [], t => J(t) === '{"a":{"@x":"1","b":["t","u"],"c":""}}');
test('XML to JSON', 'entities, CDATA, comments and declaration', '<?xml version="1.0"?><!-- c --><m>1 &lt; 2 &amp; <![CDATA[<raw>]]>&#x41;</m>', [], t => J(t) === '{"m":"1 < 2 & <raw>A"}');
test('XML to JSON', 'mixed content with type conversion', '<p id="7">hi <b>x</b></p>', [true, true], t => J(t) === '{"p":{"@id":7,"b":"x","#text":"hi"}}');
test('XML to JSON', 'attributes can be dropped', '<a x="1"><b y="2">t</b></a>', [false], t => J(t) === '{"a":{"b":"t"}}');
fails('XML to JSON', 'mismatched tags', '<a><b></a>');
fails('XML to JSON', 'two root elements', '<a/><b/>');
test('JSON to XML', 'reverses the XML to JSON convention', '{"a":{"@x":"1","b":["t","u"],"c":""}}', ['root', false], '<a x="1"><b>t</b><b>u</b><c></c></a>');
test('JSON to XML', 'wraps arrays and escapes text', '[1,"<2>"]', ['list', false], '<list><item>1</item><item>&lt;2&gt;</item></list>');
test('JSON to XML', 'pretty prints by default', '{"r":{"k":{"v":1}}}', [], '<r>\n  <k>\n    <v>1</v>\n  </k>\n</r>');
fails('JSON to XML', 'key that is not a valid element name', '{"a":{"1 bad":1}}');
test('TOML to JSON', 'matches the reference parser on a document using every syntax form', toml.doc, [], t => J(t) === JSON.stringify(toml.expected));
test('TOML to JSON', 'keeps dates as strings', 'when = 2026-10-13T10:00:00Z\nday = 2026-10-13', [], t => J(t) === '{"when":"2026-10-13T10:00:00Z","day":"2026-10-13"}');
fails('TOML to JSON', 'duplicate key', 'a = 1\na = 2');
fails('TOML to JSON', 'missing value', 'a =');
test('JSON to TOML', 'tables and arrays of tables', '{"title":"x","server":{"host":"h","ports":[1,2]},"user":[{"name":"a"},{"name":"b"}]}', [], 'title = "x"\n\n[server]\nhost = "h"\nports = [1, 2]\n\n[[user]]\nname = "a"\n\n[[user]]\nname = "b"\n');
test('JSON to TOML', 'round trips through TOML to JSON', JSON.stringify(toml.expected), [], async t => J(dec.decode(await run('TOML to JSON', t))) === JSON.stringify(toml.expected));
fails('JSON to TOML', 'null has no TOML form', '{"a":null}');
test('INI to JSON', 'sections, comments, flags, repeats and types', '; c\nname=top\n[db]\nhost = localhost\nport=5432 ; note\nflag\n[db.pool]\nsize: 10\nlist=a\nlist=b', [true, false],
  t => J(t) === '{"name":"top","db":{"host":"localhost","port":5432,"flag":true},"db.pool":{"size":10,"list":["a","b"]}}');
test('INI to JSON', 'dotted sections can nest; quoted values stay text', '[a.b]\nk="1"', [true, true], t => J(t) === '{"a":{"b":{"k":"1"}}}');
test('JSON to INI', 'sections, nested sections and repeated keys', '{"name":"top","db":{"host":"localhost","opts":{"x":1},"l":["a","b"]}}', [], 'name=top\n\n[db]\nhost=localhost\nl=a\nl=b\n\n[db.opts]\nx=1\n');
test('JSON Flatten', 'nested objects and arrays', '{"a":{"b":[1,{"c":null}],"e":{}},"f":"x"}', [], t => J(t) === '{"a.b[0]":1,"a.b[1].c":null,"a.e":{},"f":"x"}');
test('JSON Flatten', 'dotted indexes as lines', '{"a":[1,"s"]}', ['.', 'Dotted: a.0', 'key = value lines'], 'a.0 = 1\na.1 = s');
test('JSON Unflatten', 'reverses JSON Flatten', '{"a.b[0]":1,"a.b[1].c":null,"a.e":{},"f":"x"}', [], t => J(t) === '{"a":{"b":[1,{"c":null}],"e":{}},"f":"x"}');
test('JSON Unflatten', 'dotted numbers as indexes', '{"a.0":"x","a.1":"y"}', ['.', true], t => J(t) === '{"a":["x","y"]}');
fails('JSON Unflatten', 'a path used as both array and object', '{"a[0]":1,"a.b":2}');

// ---- Web and HTTP ------------------------------------------------------------------------------------
const P = t => JSON.parse(t);
test('Parse HTTP message', 'request with query, cookies, Basic credentials and a form body',
  'POST /login?next=%2Fhome&x=1 HTTP/1.1\r\nHost: example.com\r\nCookie: sid=abc; theme=dark\r\nAuthorization: Basic YWxpY2U6czNjcmV0\r\nContent-Type: application/x-www-form-urlencoded\r\n\r\nuser=alice&pw=a+b%21', [],
  t => { const m = P(t); return m.type === 'request' && m.method === 'POST' && m.path === '/login' && m.query.next === '/home' && m.cookies.sid === 'abc' && m.authorization.username === 'alice' && m.authorization.password === 's3cret' && m.form.pw === 'a b!' && m.url === 'http://example.com/login?next=%2Fhome&x=1' && m.bodyLength === 20; });
test('Parse HTTP message', 'response with repeated Set-Cookie headers', 'HTTP/1.1 302 Found\r\nSet-Cookie: a=1; Path=/; HttpOnly\r\nSet-Cookie: b=2; Secure; SameSite=Lax\r\nLocation: /x\r\n\r\n', [],
  t => { const m = P(t); return m.type === 'response' && m.status === 302 && m.reason === 'Found' && m.setCookies.length === 2 && m.setCookies[1].attributes.samesite === 'Lax' && m.headers.Location === '/x'; });
test('Parse HTTP message', 'JSON body and LF-only line endings', 'HTTP/2 200\ncontent-type: application/json\n\n{"ok":true}', [], t => P(t).json.ok === true && P(t).version === '2');
fails('Parse HTTP message', 'text that is not HTTP', 'hello there');
test('Query String to JSON', 'URL with repeated and empty parameters', 'https://x.test/p?a=1&b=two+words&b=%C3%A9&c#frag', [], t => J(t) === '{"a":"1","b":["two words","é"],"c":""}');
test('Query String to JSON', 'plus can be kept literal', 'q=1+1', [false], t => J(t) === '{"q":"1+1"}');
test('JSON to Query String', 'object with a repeated key', '{"a":"1","b":["x","y"],"c":"two words"}', [], 'a=1&b=x&b=y&c=two+words');
test('JSON to Query String', 'round trips with Query String to JSON', '{"a":"1","b":["x","é"],"c":""}', [], async t => J(dec.decode(await run('Query String to JSON', t))) === '{"a":"1","b":["x","é"],"c":""}');
test('JSON to Query String', 'percent-encodes spaces when asked', '{"q":"a b"}', [false], 'q=a%20b');
fails('JSON to Query String', 'nested object has no flat query form', '{"a":{"b":1}}');
test('Parse Cookies', 'Cookie request header', 'Cookie: a=1; b="q"', [], t => J(t) === '{"a":"1","b":"q"}');
test('Parse Cookies', 'Set-Cookie attributes and notes', 'Set-Cookie: __Host-s=x; Path=/; Secure; HttpOnly; SameSite=Strict\nSet-Cookie: t=1', [],
  t => { const c = P(t); return c.length === 2 && c[0].name === '__Host-s' && c[0].attributes.samesite === 'Strict' && c[0].notes.length === 1 && /session cookie/.test(c[0].notes[0]) && c[1].notes.some(n => /no Secure flag/.test(n)); });
test('Parse SPF Record', 'typical record', 'v=spf1 ip4:192.0.2.0/24 include:_spf.example.net mx ~all', [], ['IPv4 192.0.2.0/24', "whatever _spf.example.net's SPF record allows", 'softfail', 'DNS-querying terms: 2 of 10', 'No problems found.']);
test('Parse SPF Record', 'dangerous +all', 'example.org. 3600 IN TXT "v=spf1 +all"', [], ['lets anyone send as this domain']);
test('Parse SPF Record', 'too many lookups', 'v=spf1 ' + Array.from({ length: 11 }, (_, i) => `include:s${i}.example.net`).join(' ') + ' -all', [], ['11 DNS-querying terms']);
fails('Parse SPF Record', 'not SPF', 'v=spf2.0/pra -all');
test('Parse DKIM Record', 'key record with a 1024-bit RSA key', () => `sel._domainkey.example.org. IN TXT "v=DKIM1; k=rsa; p=${generateKeyPairSync('rsa', { modulusLength: 1024 }).publicKey.export({ type: 'spki', format: 'der' }).toString('base64')}"`, [],
  ['DKIM key record', 'RSA key length: 1024 bits', '2048 bits is the current recommendation']);
test('Parse DKIM Record', 'revoked key', 'v=DKIM1; k=rsa; p=', [], ['this key has been revoked']);
test('Parse DKIM Record', 'signature header', 'DKIM-Signature: v=1; a=rsa-sha256; c=relaxed/relaxed; d=example.org; s=sel1;\r\n t=1700000000; h=from:to:subject:date; bh=abc=; b=xyz', [],
  ['DKIM-Signature header', 'sel1._domainkey.example.org', '2023-11-14T22:13:20.000Z', 'from, to, subject, date', 'No problems found.']);
test('Parse DMARC Record', 'monitoring-only policy', 'v=DMARC1; p=none; rua=mailto:d@example.org; pct=50', [], ['take no action (monitor only)', 'p=none only monitors', 'pct=50', 'aggregate reports go to d@example.org']);
test('Parse DMARC Record', 'strict policy', '_dmarc.example.org. IN TXT "v=DMARC1; p=reject; rua=mailto:d@example.org; adkim=s"', [], ['reject the message', 'strict (exact domain match)', 'No problems found.']);
fails('Parse DMARC Record', 'not DMARC', 'v=spf1 -all');

// ---- Windows identifiers and tickets ---------------------------------------------------------------------
// The SID and its bytes are the example from Microsoft's documentation. Kerberos tickets are assembled here from
// the format specifications (RFC 4120 and the MIT credential cache format), not captured from a domain controller.
test('Windows SID Converter', 'text to binary (Microsoft documentation example)', 'S-1-5-21-2127521184-1604012920-1887927527-72713', [],
  ['Binary (hex):   010500000000000515000000a065cf7e784b9b5fe77c8770091c0100', 'RID:            72713', 'Domain SID:     S-1-5-21-2127521184-1604012920-1887927527']);
test('Windows SID Converter', 'binary hex to text', '01 05 00 00 00 00 00 05 15 00 00 00 A0 65 CF 7E 78 4B 9B 5F E7 7C 87 70 09 1C 01 00', [], ['SID:            S-1-5-21-2127521184-1604012920-1887927527-72713']);
test('Windows SID Converter', 'Base64 objectSid and well-known names', 'AQEAAAAAAAUSAAAA\nS-1-5-32-544\nS-1-5-21-1-2-3-512', [], ['Local System (SYSTEM)', 'BUILTIN\\Administrators', '01020000000000052000000020020000', 'Domain Admins']);
fails('Windows SID Converter', 'not a SID', 'S-banana');
test('Parse SDDL', 'owner, group, DACL and SACL', 'O:BAG:SYD:PAI(A;OICI;FA;;;SY)(A;;0x1200a9;;;BU)(D;;GA;;;S-1-5-7)S:(ML;;NW;;;LW)', [],
  ['Owner: BUILTIN\\Administrators (BA)', 'Group: Local System (SY)', 'protected (does not inherit from the parent)', 'Allow: Local System (SY)', 'File All Access', 'child objects inherit; child containers inherit',
    '0x1200a9 = Synchronize, Read Control, object-specific rights 0xa9', 'Deny: S-1-5-7 = Anonymous Logon', 'Generic All', 'Mandatory integrity label: Low integrity (LW)', 'No Write Up']);
test('Parse SDDL', 'service descriptor from sc sdshow', 'D:(A;;CCLCSWRPWPDTLOCRRC;;;SY)(A;;CCDCLCSWRPWPDTLOCRSDRCWDWO;;;BA)', [], ['Create Child, List Children, Self Write, Read Property, Write Property, Delete Tree, List Object, Control Access (extended right), Read Control', 'Write Owner']);
fails('Parse SDDL', 'not SDDL', 'hello');
test('GUID Byte Order Converter', 'GUID to stored bytes', '{00112233-4455-6677-8899-aabbccddeeff}', [], ['Windows byte order (mixed-endian): 33 22 11 00 55 44 77 66 88 99 aa bb cc dd ee ff', 'Network byte order (big-endian):   00 11 22 33 44 55 66 77 88 99 aa bb cc dd ee ff']);
test('GUID Byte Order Converter', 'stored bytes to GUID', '33221100554477668899aabbccddeeff', [], ['If stored by Windows (mixed-endian):    00112233-4455-6677-8899-aabbccddeeff', 'If in network order (big-endian, RFC):  33221100-5544-7766-8899-aabbccddeeff']);
test('GUID Byte Order Converter', 'identifies the version', '550e8400-e29b-41d4-a716-446655440000', [], ['version 4 (random), RFC 4122 variant']);
fails('GUID Byte Order Converter', 'wrong length', '0011223344');
{
  const ctx = (n, inner) => derTLV(0xa0 | n, inner), int = n => derTLV(0x02, Uint8Array.of(n)), gstr = s => derTLV(0x1b, bytes(s)), octets = b => derTLV(0x04, b), ktime = s => derTLV(0x18, bytes(s));
  const pname = (type, parts) => derSequence([ctx(0, int(type)), ctx(1, derSequence(parts.map(gstr)))]);
  const encData = (etype, kvno, cipher) => derSequence([ctx(0, int(etype)), ...(kvno === null ? [] : [ctx(1, int(kvno))]), ctx(2, octets(cipher))]);
  const ticket = (etype, service) => derTLV(0x61, derSequence([ctx(0, int(5)), ctx(1, gstr('CORP.EXAMPLE')), ctx(2, pname(2, service)), ctx(3, encData(etype, 2, new Uint8Array(64).fill(7)))]));
  const info = derSequence([ctx(0, derSequence([ctx(0, int(18)), ctx(1, octets(new Uint8Array(32).fill(0xab)))])), ctx(1, gstr('CORP.EXAMPLE')), ctx(2, pname(1, ['alice'])), ctx(3, derTLV(0x03, Uint8Array.of(0, 0x40, 0xe1, 0, 0))),
    ctx(4, ktime('20261013100000Z')), ctx(5, ktime('20261013100000Z')), ctx(6, ktime('20361010100000Z')), ctx(7, ktime('20361010100000Z')), ctx(8, gstr('CORP.EXAMPLE')), ctx(9, pname(2, ['krbtgt', 'CORP.EXAMPLE']))]);
  const kirbi = derTLV(0x76, derSequence([ctx(0, int(5)), ctx(1, int(22)), ctx(2, derSequence([ticket(18, ['krbtgt', 'CORP.EXAMPLE'])])), ctx(3, encData(0, null, derTLV(0x7d, derSequence([ctx(0, derSequence([info]))]))))]));
  const expectKirbi = ['Kerberos KRB-CRED (.kirbi), 1 ticket', 'Client:        alice@CORP.EXAMPLE', 'Service:       krbtgt/CORP.EXAMPLE@CORP.EXAMPLE', 'etype 18 (aes256-cts-hmac-sha1-96), ' + 'ab'.repeat(32),
    '0x40e10000 (forwardable, renewable, initial, pre-authenticated, name-canonicalize)', 'Expires:       2036-10-10T10:00:00Z', 'key version 2, 64 bytes of ciphertext', 'ticket-granting ticket (TGT)', 'Lifetime is 3650 days'];
  test('Parse Kerberos Ticket', '.kirbi with a readable credential part', kirbi, [], expectKirbi);
  test('Parse Kerberos Ticket', '.kirbi pasted as Base64', Buffer.from(kirbi).toString('base64'), [], expectKirbi);
  const be32 = n => [n >>> 24 & 255, n >>> 16 & 255, n >>> 8 & 255, n & 255], be16 = n => [n >> 8 & 255, n & 255];
  const cdata = b => bytes(be32(b.length), b), cprinc = (type, parts) => bytes(be32(type), be32(parts.length), cdata(bytes('CORP.EXAMPLE')), ...parts.map(p => cdata(bytes(p))));
  const ccache = bytes([5, 4], be16(12), [0, 1, 0, 8, 255, 255, 255, 255, 0, 0, 0, 0], cprinc(1, ['bob']), cprinc(1, ['bob']), cprinc(2, ['cifs', 'fs01.corp.example']), be16(23), cdata(new Uint8Array(16).fill(0x11)),
    be32(1791885600), be32(1791885600), be32(1791921600), be32(1792490400), [0], be32(0x40a10000), be32(0), be32(0), cdata(ticket(23, ['cifs', 'fs01.corp.example'])), cdata(new Uint8Array(0)));
  test('Parse Kerberos Ticket', 'credential cache (ccache) version 4', ccache, [], ['Kerberos credential cache (ccache), format version 4', 'Default principal: bob@CORP.EXAMPLE (principal)', 'Service:       cifs/fs01.corp.example@CORP.EXAMPLE',
    'etype 23 (rc4-hmac), ' + '11'.repeat(16), 'Valid from:    2026-10-13T10:00:00Z', 'Expires:       2026-10-13T20:00:00Z', 'encrypted with etype 23 (rc4-hmac), key version 2', 'RC4 (etype 23) is in use']);
  fails('Parse Kerberos Ticket', 'unrelated bytes', bytes([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 250, 251]));
}

// ---- Log and capture formats -------------------------------------------------------------------------
test('Parse Syslog', 'RFC 5424 with structured data', '<34>1 2026-10-13T22:14:15.003Z host1 su 1234 ID47 [exampleSDID@32473 iut="3" eventID="1011"] failed login for user root', [],
  t => { const r = P(t); return r.format === 'RFC 5424' && r.severity === '2 (critical)' && r.facility === '4 (auth)' && r.host === 'host1' && r.app === 'su' && r.structuredData['exampleSDID@32473'].iut === '3' && r.message === 'failed login for user root'; });
test('Parse Syslog', 'RFC 3164 (BSD) with tag and pid', '<13>Oct 11 22:14:15 myhost sshd[1234]: Failed password for root', [], t => { const r = P(t); return r.format === 'RFC 3164 (BSD)' && r.host === 'myhost' && r.tag === 'sshd' && r.pid === '1234' && r.severity === '5 (notice)' && r.message === 'Failed password for root'; });
test('Parse Syslog', 'BSD without a priority prefix', 'Oct 11 22:14:15 host cron: job ran', [], t => P(t).format === 'BSD syslog (no priority)' && P(t).tag === 'cron');
test('Parse CEF', 'header and extension with labels', 'Sep 19 08:26:10 host CEF:0|Security|threatmanager|1.0|100|worm stopped|10|src=10.0.0.1 spt=1232 dst=2.1.2.2 cs1Label=Zone cs1=DMZ act=blocked', [],
  t => { const r = P(t); return r.syslogPrefix === 'Sep 19 08:26:10 host' && r.deviceVendor === 'Security' && r.signatureId === '100' && r.severity === '10' && r.extension.sourceAddress === '10.0.0.1' && r.extension.Zone === 'DMZ' && r.extension.action === 'blocked'; });
test('Parse CEF', 'escaped pipes and equals', 'CEF:0|v\\|endor|p|1|1|n|5|msg=a\\=b src=1.1.1.1', [], t => { const r = P(t); return r.deviceVendor === 'v|endor' && r.extension.message === 'a=b'; });
fails('Parse CEF', 'no CEF header', 'just a log line');
test('Parse LEEF', 'version 2.0 with a tab delimiter', 'LEEF:2.0|Lancope|StealthWatch|1.0|41|x09|src=10.0.0.1\tdst=10.0.0.2\tspt=443', [], t => { const r = P(t); return r.leefVersion === '2.0' && r.vendor === 'Lancope' && r.eventId === '41' && r.delimiter === 'tab' && r.attributes.src === '10.0.0.1' && r.attributes.spt === '443'; });
test('Parse LEEF', 'version 1.0 (tab-separated)', 'LEEF:1.0|Vendor|Product|1.0|EVID|cat=auth\tusrName=alice\tsrc=10.0.0.9', [], t => { const r = P(t); return r.leefVersion === '1.0' && r.attributes.usrName === 'alice'; });
test('Summarise Suricata EVE', 'alert and flow events', ['{"timestamp":"2026-10-13T00:00:01Z","event_type":"alert","src_ip":"10.0.0.5","dest_ip":"8.8.8.8","dest_port":53,"proto":"UDP","alert":{"signature":"ET MALWARE Suspicious","category":"A Network Trojan","severity":1}}',
  '{"timestamp":"2026-10-13T00:00:02Z","event_type":"dns","src_ip":"10.0.0.5","dest_ip":"8.8.8.8","dest_port":53,"proto":"UDP","dns":{"rrname":"evil.example"}}', 'not json', '{"event_type":"flow","src_ip":"10.0.0.5","dest_ip":"1.1.1.1","proto":"TCP"}'].join('\n'), [],
  ['Suricata EVE: 3 events, 1 malformed lines skipped', 'alert', 'dns', '[sev 1] ET MALWARE Suspicious', 'A Network Trojan', 'Top DNS queries', 'evil.example', '10.0.0.5']);
fails('Summarise Suricata EVE', 'no events', 'nothing here');
test('Parse Zeek Log', 'conn.log with typed fields', ['#separator \\x09', '#set_separator\t,', '#empty_field\t(empty)', '#unset_field\t-', '#path\tconn', '#fields\tts\tuid\tid.orig_h\tid.resp_p\tproto\tduration\torig_bytes\ttunnel_parents',
  '#types\ttime\tstring\taddr\tport\tenum\tinterval\tcount\tset[string]', '1600000000.0\tCabc\t10.0.0.1\t443\ttcp\t0.5\t1024\t-'].join('\n'), [],
  t => { const r = P(t); return r['id.resp_p'] === 443 && r.proto === 'tcp' && r.duration === 0.5 && r.orig_bytes === 1024 && r.tunnel_parents === null; });
test('Parse Zeek Log', 'reports the path and count', ['#fields\ta\tb', '#types\tcount\tstring', '1\tx', '2\ty'].join('\n'), [true], t => P(t).count === 2 && P(t).rows.length === 2);
fails('Parse Zeek Log', 'no #fields header', 'just\tsome\ttext');
test('Summarise HAR', 'request breakdown', JSON.stringify({ log: { entries: [
  { _resourceType: 'document', time: 120, request: { method: 'GET', url: 'https://example.com/' }, response: { status: 200, _transferSize: 2048, content: { size: 8000, mimeType: 'text/html' } } },
  { _resourceType: 'script', time: 400, request: { method: 'GET', url: 'https://cdn.other.net/app.js' }, response: { status: 200, _transferSize: 51200, content: { size: 150000, mimeType: 'application/javascript' } } },
  { _resourceType: 'xhr', time: 60, request: { method: 'POST', url: 'https://example.com/api' }, response: { status: 404, _transferSize: 300, content: { size: 100, mimeType: 'application/json' } } }] } }), [],
  ['HAR: 3 requests', 'By host', 'example.com', 'cdn.other.net', 'By resource type', 'script', 'By status code', 'By method: GET=2, POST=1', 'Slowest responses', 'app.js', 'Largest responses']);
fails('Summarise HAR', 'not a HAR file', '{"log":{}}');

// ---- Serialised objects and authentication messages -------------------------------------------------
// Pickle and SAML vectors are produced by Python (pickle/pickletools and zlib). Java and NTLM messages are
// assembled here from their format specifications (JDK serialization, MS-NLMP).
const g9 = JSON.parse(fixture('group9-reference.json'));
const le16 = n => [n & 255, n >> 8 & 255], le32 = n => [n & 255, n >> 8 & 255, n >> 16 & 255, n >>> 24 & 255];
const utf16 = s => Uint8Array.from([...s].flatMap(c => [c.charCodeAt(0) & 255, c.charCodeAt(0) >> 8]));
const jutf = s => bytes(le16(s.length).reverse(), s);   // Java modified-UTF uses a big-endian 2-byte length

test('Disassemble Python Pickle', 'lists opcodes and imports of a benign pickle', () => b64(g9.pickle_benign), [], t => ['Python pickle, protocol 4', 'PROTO', 'EMPTY_DICT', 'alice', 'MEMOIZE', 'STOP'].every(s => t.includes(s)) && !/code-execution opcodes/.test(t));
test('Disassemble Python Pickle', 'flags the code-execution opcodes in a hostile pickle', () => b64(g9.pickle_hostile), [],
  t => t.includes('GLOBAL') && /nt\.system|posix\.system|os\.system/.test(t) && t.includes('REDUCE') && /<-- code execution opcode/.test(t) && /uses code-execution opcodes/.test(t) && /Imports requested:/.test(t));
fails('Disassemble Python Pickle', 'empty input', '');
test('Inspect Java Serialized Object', 'a simple string stream', bytes([0xac, 0xed, 0x00, 0x05, 0x74], jutf('hello world')), [], ['Java serialized object, stream version 5', 'string', 'hello world']);
test('Inspect Java Serialized Object', 'flags a gadget class', bytes([0xac, 0xed, 0x00, 0x05, 0x73, 0x72], jutf('org.apache.commons.collections.functors.InvokerTransformer'), [0, 0, 0, 0, 0, 0, 0, 1], [0x02], le16(0).reverse(), [0x78, 0x70, 0x78]), [],
  ['class #', 'InvokerTransformer', 'known gadget-chain class', 'WARNING', 'do not deserialize it']);
test('Inspect Java Serialized Object', 'accepts Base64', () => Buffer.from(bytes([0xac, 0xed, 0x00, 0x05, 0x74], jutf('hi'))).toString('base64'), [], ['stream version 5', 'hi']);
fails('Inspect Java Serialized Object', 'not a Java stream', bytes([1, 2, 3, 4]));
{
  const type2 = bytes('NTLMSSP\0', le32(2), le16(8), le16(8), le32(56), [0x05, 0x82, 0x89, 0xa2], [1, 2, 3, 4, 5, 6, 7, 8], new Uint8Array(8),
    le16(16), le16(16), le32(64), utf16('CORP'), utf16('CORP'), bytes(le16(1), le16(8), utf16('WS01'), le16(0), le16(0)));
  test('Parse NTLM Message', 'challenge (type 2) with target info', type2, [], ['Challenge (type 2, server → client)', 'Target name: CORP', 'Server challenge: 0102030405060708', 'Negotiate Unicode', 'Negotiate NTLM', 'NetBIOS computer name: WS01']);
  test('Parse NTLM Message', 'challenge accepts Base64', () => Buffer.from(type2).toString('base64'), [], ['Server challenge: 0102030405060708']);
  const nt = bytes(new Uint8Array(16).fill(0xaa), new Uint8Array(32).fill(0xbb));
  const type3 = bytes('NTLMSSP\0', le32(3), le16(24), le16(24), le32(64), le16(48), le16(48), le32(88), le16(8), le16(8), le32(136), le16(10), le16(10), le32(144), le16(8), le16(8), le32(154), le16(0), le16(0), le32(162), le32(1),
    new Uint8Array(24), nt, utf16('CORP'), utf16('alice'), utf16('WS01'));
  test('Parse NTLM Message', 'authenticate (type 3) as NTLMv2', type3, [], ['Authenticate (type 3, client → server)', 'Domain: CORP', 'User: alice', 'Workstation: WS01', 'NTLMv2', 'net-NTLMv2 hash', 'alice::CORP:', 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa:bbbbbbbb']);
  fails('Parse NTLM Message', 'not NTLM', bytes('hello123'));
}
test('Decode SAML Message', 'POST binding (Base64 of XML)', () => g9.saml_post, [], ['SAML Response', 'Issuer: https://idp.example.org/metadata', 'Status: Success', 'Subject (NameID): alice@example.org', 'Audience: https://sp.example.com', 'role: admin', 'Signed: no signature found']);
test('Decode SAML Message', 'Redirect binding (Base64 of DEFLATE)', () => g9.saml_redirect, [], ['SAML Response', 'alice@example.org', 'Valid: 2026-10-13T09:59:00Z to 2026-10-13T10:05:00Z']);
test('Decode SAML Message', 'returns the XML', () => g9.saml_post, ['XML'], t => t.startsWith('<samlp:Response') && t.includes('alice@example.org'));
fails('Decode SAML Message', 'not SAML', 'hello');
test('Decode ViewState', 'extracts strings and tallies structure', bytes([0xff, 0x01, 0x0f, 0x05], [12], 'controlState', [0x05], [5], 'alice', [0x64]), [], ['not encrypted', 'Embedded strings', 'controlState', 'alice']);
test('Decode ViewState', 'flags a gadget type name', bytes([0xff, 0x01, 0x05], [43], 'System.Windows.Data.ObjectDataProvider, PresentationFramework'), [], ['ObjectDataProvider', 'WARNING', 'gadget chain']);
test('Decode ViewState', 'detects encryption', () => Buffer.from(bytes(new Uint8Array(48).fill(0x41))).toString('base64'), [], ['it is encrypted', 'cannot be read without that key']);
fails('Decode ViewState', 'empty', '');

// ---- Script deobfuscation (static rewriting only; nothing is executed) -------------------------------
test('PowerShell Decode EncodedCommand', 'decodes a UTF-16LE Base64 payload', () => `powershell -nop -w hidden -enc ${Buffer.from("Write-Host 'hello'", 'utf16le').toString('base64')}`, [], "Write-Host 'hello'");
test('PowerShell Decode EncodedCommand', 'accepts the bare Base64', () => Buffer.from('IEX (New-Object Net.WebClient)', 'utf16le').toString('base64'), [], 'IEX (New-Object Net.WebClient)');
fails('PowerShell Decode EncodedCommand', 'no payload', 'hello');
test('PowerShell Deobfuscate', 'removes backticks and joins strings', "`i`e`x ('He'+'llo')", [], "iex ('Hello')");
test('PowerShell Deobfuscate', 'evaluates the format operator', '("{0}{1}{0}" -f \'ab\',\'c\')', [], "'abcab'");
test('PowerShell Deobfuscate', 'resolves [char] codes and joins them', '[char]72+[char]105', [], "'Hi'");
test('Unpack JavaScript', 'reverses the p,a,c,k,e,r', "eval(function(p,a,c,k,e,d){while(c--){if(k[c]){p=p.replace(new RegExp('\\\\b'+c.toString(a)+'\\\\b','g'),k[c])}}return p}('0 1=2',3,3,'var|x|5'.split('|'),0,{}))", [], t => t.trim() === 'var x=5');
fails('Unpack JavaScript', 'not packed', 'function f(){ return 1; }');
test('Normalise Obfuscated JavaScript', 'fromCharCode, escapes and concatenation', 'var a=String.fromCharCode(72,0x69)+"\\x20"+"\\u0057orld";', [], t => t.includes('"Hi"') && t.includes('" World"') || t.includes('"Hi World"') || (t.includes('Hi') && t.includes('World')));
test('Normalise Obfuscated JavaScript', 'joins adjacent literals', '"a"+"b"+"c"', [], '"abc"');
test('Decode JavaScript String Array', 'substitutes index references', "var _0x1a=['alert','hello world'];_0x1a[0x0](_0x1a[1]);", [], t => t.includes("'alert'('hello world')"));
test('Decode JavaScript String Array', 'handles a decoder function with an offset', "var _0xa=['msg','warn'];function _0xd(i){return _0xa[i-0x10];}_0xd(0x10)+_0xd(17);", [], t => t.includes("'msg'") && t.includes("'warn'"));
fails('Decode JavaScript String Array', 'no array', 'console.log(1)');
test('Deobfuscate VB Script', 'resolves Chr and concatenation', 'a = Chr(72) & Chr(&H69) & Chr(33)', [], 'a = "Hi!"');
test('Deobfuscate VB Script', 'evaluates StrReverse', 'x = StrReverse("dlrow")', [], 'x = "world"');

// ---- Malicious-document triage ----------------------------------------------------------------------
// The OLE/VBA fixture is a real compound file validated by olefile + oletools.decompress_stream; the PDF stream
// is zlib-compressed (FlateDecode) and checked against the original; the RTF and EML are standard constructions.
const vba = JSON.parse(fixture('vba-reference.json'));
const docs = JSON.parse(fixture('docs-reference.json'));
test('Parse OLE File', 'lists the VBA storage and streams', () => b64(vba.ole_b64), [], ['OLE compound file', 'storage(s)', 'stream(s)', '[Storage] VBA', 'dir', 'Module1', 'contains VBA macros']);
test('Parse OLE File', 'extracts a stream by number', () => b64(vba.ole_b64), [2], (t, b) => b.length > 0);
fails('Parse OLE File', 'not an OLE file', bytes('hello world not ole'));
test('Extract VBA Macros', 'recovers the module source and flags behaviour', () => b64(vba.ole_b64), ['Source and analysis'], t => t.includes('Module1') && t.includes(vba.source.split('\r\n').slice(1, 3).join('\n')) && t.includes('AutoOpen') && t.includes('runs automatically when the document opens') && t.includes('creates COM objects (CreateObject)'));
test('Extract VBA Macros', 'source-only output matches the oracle exactly', () => b64(vba.ole_b64), ['Source only'], t => t.includes(vba.source.replace(/\r\n/g, '\n').trimEnd()));
fails('Extract VBA Macros', 'a document with no macros', () => b64(docs.pdf_b64), ['Source and analysis']);
test('Analyse PDF', 'flags JavaScript and an auto-run action', () => b64(docs.pdf_b64), [], ['PDF version 1.7', '/JavaScript', '/OpenAction', 'an action runs automatically', `app.alert('test')`, 'can act when opened']);
fails('Analyse PDF', 'not a PDF', bytes('just text'));
test('Extract PDF Streams', 'decodes a FlateDecode stream', () => b64(docs.pdf_b64), [0], ['stream(s) in this PDF', 'FlateDecode']);
test('Extract PDF Streams', 'extracts and inflates a stream to its original bytes', () => b64(docs.pdf_b64), [1], t => t === docs.pdf_stream_decoded);
test('Extract RTF Objects', 'decodes an embedded OLE package', () => docs.rtf, [0], ['embedded object(s) in this RTF', 'Package']);
test('Extract RTF Objects', 'extracts an object to bytes', () => docs.rtf, [1], (t, b) => b.length > 8 && b[0] === 0x01 && b[1] === 0x05);
fails('Extract RTF Objects', 'not RTF', bytes('{not rtf}'));
test('Parse EML', 'summary with decoded subject and attachment', () => docs.eml, ['Summary'], ['Email message', 'From: Alice <alice@example.org>', `Subject: ${docs.eml_subject}`, 'spf=pass', 'multipart/mixed', 'text/plain', 'Attachments (1)', 'data.csv', 'text/csv']);
test('Parse EML', 'decodes the quoted-printable text body', () => docs.eml, ['Text body'], t => t.includes('Hello Bob,') && t.includes('résumé is attached.'));
test('Parse EML', 'extracts the attachment bytes', () => docs.eml, ['Attachment', 1], (t, b) => Buffer.from(b).toString('base64') === docs.eml_attachment_b64);
fails('Parse EML', 'no such attachment', () => docs.eml, ['Attachment', 5]);

// ---- Disassembly (Capstone/WASM) — compared instruction-for-instruction against the Python capstone oracle ----
const disasm = JSON.parse(fixture('disasm-reference.json'));
const instrs = out => out.split('\n').filter(l => l && !l.startsWith(';'));
for (const [label, ref] of Object.entries(disasm.arches)) {
  if (label.startsWith('_')) continue;
  const expected = ref.rows.map(r => `${r.mn}${r.op ? ' ' + r.op : ''}`);
  test('Disassemble', `${label} matches the capstone oracle`, ref.code, [label, 'Intel', '0x1000', true], out => {
    const lines = instrs(out);
    if (lines.length !== ref.rows.length) return false;
    return ref.rows.every((r, i) => lines[i].includes('0x' + r.addr.toString(16)) && lines[i].includes(expected[i]));
  });
}
test('Disassemble', 'AT&T syntax switches operand style', disasm.arches['x86 (64-bit)'].code, ['x86 (64-bit)', 'AT&T', '0x1000', true], t => t.includes('%rbp') && t.includes('%rsp'));
test('Disassemble', 'accepts spaced/0x hex and a base address', '0x55 0x48 0x89 0xe5', ['x86 (64-bit)', 'Intel', '0x400000', false], ['0x400000', 'push rbp', 'mov rbp, rsp']);
test('Disassemble', 'reports bytes it cannot decode', 'c3ffff', ['x86 (64-bit)', 'Intel', '0', true], t => t.includes('ret') && /could not be disassembled/.test(t));
test('Disassemble', 'stops at the max-instructions limit', '9090909090', ['x86 (64-bit)', 'Intel', '0', true, 2], t => (t.match(/\bnop\b/g) || []).length === 2 && /stopped at the 2-instruction limit; 3 more byte/.test(t));
test('Disassemble', 'max instructions 0 decodes everything (small input)', '9090909090', ['x86 (64-bit)', 'Intel', '0', true, 0], t => (t.match(/\bnop\b/g) || []).length === 5 && !/stopped/.test(t));
test('Disassemble', 'count 0 on a large dense input is bounded, not an engine abort', '90'.repeat(64 * 1024), ['x86 (64-bit)', 'Intel', '0', false, 0], t => (t.match(/\bnop\b/g) || []).length === 16000 && /stopped after 16000 instructions/.test(t));
fails('Disassemble', 'input over 64 KiB is rejected', '90'.repeat(70000));
fails('Disassemble', 'empty input', '');

// ---- MITRE ATT&CK lookup (data distilled from the official MITRE STIX bundle) ----
test('MITRE ATT&CK Lookup', 'technique details for a known sub-technique', 'T1059.001', ['Auto', false, 25],
  ['T1059.001', 'PowerShell', 'sub-technique of T1059', 'Tactics:', 'Execution', 'attack.mitre.org/techniques/T1059/001', 'Mitigations:']);
test('MITRE ATT&CK Lookup', 'several IDs at once', 'T1486, T1055', ['Auto', false, 25], t => t.includes('T1486') && /Data Encrypted for Impact/i.test(t) && t.includes('T1055') && /Process Injection/i.test(t));
test('MITRE ATT&CK Lookup', 'keyword search by name', 'powershell', ['Auto', false, 25], t => /technique\(s\) match/.test(t) && t.includes('T1059.001') && t.includes('PowerShell'));
test('MITRE ATT&CK Lookup', 'unknown ID is reported', 'T9999', ['Technique details', false, 25], ['T9999', 'not found']);
fails('MITRE ATT&CK Lookup', 'empty input', '');

// ---- MAC vendor lookup (IEEE registry via the Wireshark manuf file) ----
// 00:00:0C is Cisco's original and very stable MA-L assignment. The MA-S case is derived from the data itself
// so the longest-prefix logic is checked against a real 36-bit registration rather than a hard-coded guess.
const masLine = JSON.parse(fixture('oui-sample.json'));
const macBulk = '00:00:0C:11:22:33\n02:11:22:33:44:55\n01:00:5e:00:00:fb';
test('MAC Vendor Lookup', 'Auto/Detailed for one well-known OUI (Cisco)', '00:00:0C:12:34:56', [], t => /Vendor:\s+Cisco/.test(t) && t.includes('MA-L (24-bit)') && t.includes('OUI 00:00:0C') && /unicast, globally unique/.test(t));
test('MAC Vendor Lookup', 'Auto picks the table for many inputs', macBulk, [], t => /^Input\s+OUI\s+Vendor\s+Registrant\s+Block\s+Address/m.test(t) && /Cisco/.test(t) && /locally administered/.test(t) && /multicast\/broadcast/.test(t));
test('MAC Vendor Lookup', 'accepts colon, hyphen, Cisco dotted and bare hex forms', '00:00:0C:11:22:33\n00-00-0C-44-55-66\n0000.0c77.8899\n00000Caabbcc', ['CSV'], t => { const rows = t.trim().split('\n'); return rows.length === 5 && rows.slice(1).every(r => /,Cisco,/.test(r)); });
test('MAC Vendor Lookup', 'longest-prefix MA-S match from the registry', masLine.mac, ['Detailed'], t => t.includes('MA-S (36-bit)') && t.includes(masLine.vendorSubstring));
test('MAC Vendor Lookup', 'picks MACs out of log lines and ignores the prose (no bogus vendors)', 'Microsoft Windows [Version 10.0.26300]\nPhysical Address. . . . : 00-00-0C-12-34-56\nIP Routing Enabled. . . : No', ['Table'],
  t => /Cisco/.test(t) && !/Microsoft|Windows|Routing/.test(t) && t.trim().split('\n').length === 3);
test('MAC Vendor Lookup', 'CSV header and flags', macBulk, ['CSV'], t => t.split('\n')[0] === 'Input,OUI,Vendor,Registrant,Block,Address,Found,Local,Multicast' && /00:00:0C:11:22:33,00:00:0C,Cisco/.test(t) && /,true,false$/m.test(t));
test('MAC Vendor Lookup', 'JSON structure', '00:00:0C:11:22:33\n02:aa:bb:cc:dd:ee', ['JSON'], t => { const j = JSON.parse(t); return Array.isArray(j) && j[0].vendor === 'Cisco' && j[0].found === true && j[0].locallyAdministered === false && j[1].locallyAdministered === true && j[1].found === false; });
test('MAC Vendor Lookup', 'Summary counts by vendor and block', macBulk + '\n00:00:0C:99:88:77', ['Summary'], ['MAC addresses: 4', 'resolved to a vendor', 'By vendor', 'Cisco', 'By registration block', 'MA-L (24-bit)', 'locally administered', 'multicast/broadcast']);
fails('MAC Vendor Lookup', 'a non-MAC input errors with guidance', 'ab');
fails('MAC Vendor Lookup', 'a whole line of prose errors (no valid MAC)', 'Primary Dns Suffix . . . : example.local');
fails('MAC Vendor Lookup', 'empty input', '');

// ---- Extractors: pull MACs and user agents out of raw text, then feed the dedicated parsers ----
const ipconfig = 'Windows IP Configuration\n\nEthernet adapter Ethernet:\n   Physical Address. . . . . . . . . : 00-00-0C-12-34-56\n   DHCP Enabled. . . . . . . . . . . : Yes\nWireless LAN adapter Wi-Fi:\n   Physical Address. . . . . . . . . : DC-A6-32-AA-BB-CC\n   IPv4 Address. . . . . . . . . . . : 192.168.1.10';
test('Extract MAC addresses', 'pulls MACs out of ipconfig output, skipping prose', ipconfig, [true, true, false, false, false], t => t.split('\n').sort().join('|') === '00-00-0C-12-34-56|DC-A6-32-AA-BB-CC' || t.split('\n').length === 2 && /00-00-0C-12-34-56/.test(t) && /DC-A6-32-AA-BB-CC/.test(t));
test('Extract MAC addresses', 'Cisco dotted and normalisation', 'ints: 0000.0c11.2233 and 00:00:0C:44:55:66', [true, true, false, true, false], t => t.includes('00:00:0c:11:22:33') && t.includes('00:00:0c:44:55:66'));
test('Extract MAC addresses', 'bare 12-hex only when opted in', 'id=0000ABCDEF01 mac 00:00:0C:11:22:33', [true, true, true, false, false], t => t.split('\n').length === 2 && /0000ABCDEF01/.test(t));
test('Extract MAC addresses', 'deduplicates case-insensitively', '00:00:0c:11:22:33\n00:00:0C:11:22:33', [true, true, false, false, false], t => t.split('\n').length === 1);
test('Extract User Agents', 'pulls the UA from an access-log line', '10.0.0.1 - - [13/Oct/2026:10:00:00 +0000] "GET / HTTP/1.1" 200 42 "-" "Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/140.0 Safari/537.36"', [true],
  t => t.split('\n').length === 1 && t.startsWith('Mozilla/5.0') && t.includes('Chrome/140.0'));
test('Extract User Agents', 'header, JSON field and raw line', 'User-Agent: curl/8.4.0\n{"user_agent":"python-requests/2.31.0"}\nMozilla/5.0 (X11; Linux x86_64) Firefox/128.0', [true],
  t => { const u = t.split('\n'); return u.includes('curl/8.4.0') && u.includes('python-requests/2.31.0') && u.some(x => /Firefox\/128\.0/.test(x)); });
test('Extract User Agents', 'ignores non-UA quoted fields and prose', '"GET / HTTP/1.1"\nsome log prose without an agent\n"Mozilla/5.0 (iPhone) Safari/604.1"', [true], t => t.split('\n').filter(Boolean).length === 1 && /iPhone/.test(t));
test('Parse User Agent', 'skips non-UA lines and notes the count', 'Mozilla/5.0 (Windows NT 10.0) Chrome/140.0\nPrimary Dns Suffix . . . :\nNode Type . . . : Hybrid', ['Table'],
  t => /Chrome/.test(t) && !/Primary Dns|Hybrid/.test(t) && /2 lines skipped: not a user-agent string/.test(t));
fails('Parse User Agent', 'all-prose input errors with guidance', 'Primary Dns Suffix . . . :\nNode Type . . . : Hybrid');

// @@NEXT-GROUP@@

let passed = 0;
const failures = [];
for (const c of CASES) {
  const input = typeof c.input === 'function' ? await c.input() : c.input;
  try {
    const out = await run(c.op, input, c.args);
    const text = dec.decode(out);
    if (c.expect === null) { failures.push(`${c.op}: ${c.label}: expected an error, got ${JSON.stringify(text.slice(0, 80))}`); continue; }
    const ok = typeof c.expect === 'string' ? text === c.expect : c.expect instanceof RegExp ? c.expect.test(text)
      : Array.isArray(c.expect) ? c.expect.every(s => text.includes(s)) : await c.expect(text, out);
    if (ok) passed++;
    else failures.push(`${c.op}: ${c.label}: ${Array.isArray(c.expect) ? 'missing ' + JSON.stringify(c.expect.filter(s => !text.includes(s))) + ' in' : typeof c.expect === 'string' ? 'expected ' + JSON.stringify(c.expect.slice(0, 160)) + ', got' : 'unexpected output'} ${JSON.stringify(text.slice(0, 260))}`);
  } catch (e) {
    if (c.expect === null) passed++; else failures.push(`${c.op}: ${c.label}: ${e.message}`);
  }
}
const covered = new Set(CASES.map(c => c.op));
for (const f of failures) console.error(`FAIL ${f}`);
console.log(`Decoders and parsers: ${passed}/${passed + failures.length} checks passed across ${covered.size} operations`);
if (failures.length) process.exitCode = 1;
