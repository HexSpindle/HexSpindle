const GREASE = new Set();
for (let h = 0; h < 16; h++) { const hex = h.toString(16); GREASE.add(parseInt(`${hex}a${hex}a`, 16)); }

function u16(b, i) { return (b[i] << 8) | b[i + 1]; }
function hex4(n) { return n.toString(16).padStart(4, '0'); }
function hexBytes(u8) { return [...u8].map(b => b.toString(16).padStart(2, '0')).join(''); }

function parseFirstAlpn(edata) {
  if (edata.length < 2) return null;
  const alpnExtLen = u16(edata, 0);
  if (alpnExtLen < 2 || edata.length < 3) return null;
  const strLen = edata[2];
  if (strLen < 1) return null;
  return edata.subarray(3, 3 + strLen);
}

function parseHighestSupportedVersion(edata) {
  if (edata.length === 2) return u16(edata, 0);
  let n = edata.length ? edata[0] : 0;
  let pos = 1, highest = 0;
  while (pos + 2 <= edata.length && n-- > 0) {
    const v = u16(edata, pos); pos += 2;
    if (GREASE.has(v)) continue;
    if (v > highest) highest = v;
  }
  return highest;
}

/** signature_algorithms extension value -> comma-separated lowercase hex, one group per 2-byte
 * algorithm, in on-the-wire order (not sorted). The leading 2-byte list-length field is dropped. */
function sigAlgsHexList(edata) {
  let hexStr = hexBytes(edata.subarray(2)).replace(/(.{4})/g, '$1,');
  if (hexStr.endsWith(',')) hexStr = hexStr.slice(0, -1);
  return hexStr;
}

export function parseHelloForJa4(data) {
  let b = data;
  if (b.length > 5 && b[0] === 0x16) {
    const reclen = u16(b, 3);
    b = b.subarray(5, 5 + reclen);
  }
  if (b.length < 4 || (b[0] !== 1 && b[0] !== 2)) throw new Error('Not a recognisable ClientHello/ServerHello (expected handshake type 1 or 2)');
  const htype = b[0];
  const hlen = (b[1] << 16) | (b[2] << 8) | b[3];
  const body = b.subarray(4, 4 + hlen);
  let i = 0;
  const helloVersion = u16(body, i); i += 2;
  i += 32; // random
  const sidlen = body[i];
  i += 1 + sidlen;

  const out = { type: htype === 1 ? 'ClientHello' : 'ServerHello', helloVersion };

  if (htype === 1) {
    const cslen = u16(body, i); i += 2;
    const ciphers = [];
    for (let j = 0; j < cslen; j += 2) {
      const v = u16(body, i + j);
      ciphers.push({ hex: hex4(v), grease: GREASE.has(v) });
    }
    i += cslen;
    const complen = body[i];
    i += 1 + complen;
    out.ciphers = ciphers;
  } else {
    const cipher = u16(body, i); i += 2;
    i += 1; // compression method
    out.cipher = { hex: hex4(cipher) };
  }

  const extensions = [];
  let alpnFirst = null, sawSni = false, supportedVersionsFound = false, supportedVersionsValue = 0, sigAlgsHex = '';
  if (i + 2 <= body.length) {
    const extlen = u16(body, i); i += 2;
    const end = Math.min(i + extlen, body.length);
    while (i + 4 <= end) {
      const etype = u16(body, i);
      const elen = u16(body, i + 2);
      const edata = body.subarray(i + 4, i + 4 + elen);
      extensions.push({ hex: hex4(etype), grease: GREASE.has(etype) });
      if (etype === 0) sawSni = true; // server_name
      if (etype === 16) alpnFirst = parseFirstAlpn(edata); // application_layer_protocol_negotiation
      if (etype === 43) { supportedVersionsFound = true; supportedVersionsValue = parseHighestSupportedVersion(edata); } // supported_versions
      if (etype === 13 && htype === 1) sigAlgsHex = sigAlgsHexList(edata); // signature_algorithms
      i += 4 + elen;
    }
  }
  out.extensions = extensions;
  out.sni = sawSni;
  out.alpnFirst = alpnFirst;
  out.version = supportedVersionsFound ? supportedVersionsValue : helloVersion;
  out.sigAlgsHex = sigAlgsHex;
  return out;
}

function tlsVersionToJa4(version) {
  switch (version) {
    case 0x0304: return '13';
    case 0x0303: return '12';
    case 0x0302: return '11';
    case 0x0301: return '10';
    case 0x0300: return 's3';
    case 0x0200: return 's2';
    case 0x0100: return 's1';
    default: return '00';
  }
}

function isAlnum(b) { return (b >= 0x30 && b <= 0x39) || (b >= 0x41 && b <= 0x5a) || (b >= 0x61 && b <= 0x7a); }

function alpnFingerprint(bytes) {
  if (!bytes || bytes.length === 0) return '00';
  const first = bytes[0], last = bytes[bytes.length - 1];
  if (isAlnum(first) && isAlnum(last)) return String.fromCharCode(first) + String.fromCharCode(last);
  const fh = first.toString(16).padStart(2, '0'), lh = last.toString(16).padStart(2, '0');
  return fh[0] + lh[1];
}

function countField(n) { return n > 99 ? '99' : n.toString().padStart(2, '0'); }

async function sha256Hex12(str) {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(str));
  return [...new Uint8Array(digest)].map(b => b.toString(16).padStart(2, '0')).join('').substring(0, 12);
}

/** Builds the four JA4 renderings (JA4, JA4_o, JA4_r, JA4_ro) from a parseHelloForJa4() ClientHello. */
export async function ja4Strings(info) {
  if (info.type !== 'ClientHello') throw new Error('JA4 is computed from a ClientHello, not a ServerHello (use JA4Server for that)');

  const ptype = 't'; // QUIC ("q") is not yet supported
  const version = tlsVersionToJa4(info.version);
  const sni = info.sni ? 'd' : 'i';
  const cipherLen = countField(info.ciphers.filter(c => !c.grease).length);
  const extLen = countField(info.extensions.filter(e => !e.grease).length);
  const alpn = alpnFingerprint(info.alpnFirst);

  const originalCiphersList = info.ciphers.filter(c => !c.grease).map(c => c.hex);
  const sortedCiphersList = [...originalCiphersList].sort();
  const sortedCiphersRaw = sortedCiphersList.join(',');
  const originalCiphersRaw = originalCiphersList.join(',');

  const originalExtensionsList = info.extensions.filter(e => !e.grease).map(e => e.hex);
  const sortedExtensionsList = originalExtensionsList.filter(h => h !== '0000' && h !== '0010').sort();
  const sortedExtensionsRaw = sortedExtensionsList.join(',') + '_' + info.sigAlgsHex;
  const originalExtensionsRaw = originalExtensionsList.join(',') + '_' + info.sigAlgsHex;

  const [sortedCiphers, originalCiphers, sortedExtensions, originalExtensions] = await Promise.all([
    sha256Hex12(sortedCiphersRaw), sha256Hex12(originalCiphersRaw),
    sha256Hex12(sortedExtensionsRaw), sha256Hex12(originalExtensionsRaw),
  ]);

  const prefix = `${ptype}${version}${sni}${cipherLen}${extLen}${alpn}`;
  return {
    JA4: `${prefix}_${sortedCiphers}_${sortedExtensions}`,
    JA4_o: `${prefix}_${originalCiphers}_${originalExtensions}`,
    JA4_r: `${prefix}_${sortedCiphersRaw}_${sortedExtensionsRaw}`,
    JA4_ro: `${prefix}_${originalCiphersRaw}_${originalExtensionsRaw}`,
  };
}

/** Builds the two JA4S renderings (JA4S, JA4S_r) from a parseHelloForJa4() ServerHello. */
export async function ja4sStrings(info) {
  if (info.type !== 'ServerHello') throw new Error('JA4Server is computed from a ServerHello, not a ClientHello (use JA4 for that)');

  const ptype = 't'; // QUIC ("q") is not yet supported
  const version = tlsVersionToJa4(info.version);
  const extLen = countField(info.extensions.length); // unlike JA4, GREASE extensions are not excluded here
  const alpn = alpnFingerprint(info.alpnFirst);
  const cipher = info.cipher.hex;

  const extensionsList = info.extensions.map(e => e.hex); // unsorted, GREASE included
  const extensionsRaw = extensionsList.join(',');
  const extensionsHash = await sha256Hex12(extensionsRaw);

  const prefix = `${ptype}${version}${extLen}${alpn}`;
  return {
    JA4S: `${prefix}_${cipher}_${extensionsHash}`,
    JA4S_r: `${prefix}_${cipher}_${extensionsRaw}`,
  };
}
