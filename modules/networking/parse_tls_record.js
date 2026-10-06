import { module } from './_cat.js';
import { A } from '../../core/registry.js';
import { rawOrHex, hexSep } from './_packet.js';

/** A byte cursor with the same out-of-bounds behaviour the TLS parsers below rely on:
 * reads past the end return short slices (which is how a truncated record is spotted)
 * rather than throwing. */
class Cursor {
  constructor(bytes, pos = 0) { this.bytes = bytes; this.length = bytes.length; this.position = pos; }
  hasMore() { return this.position < this.length; }
  moveTo(pos) { this.position = pos; }
  getBytes(n = null) {
    if (this.position > this.length) return undefined;
    const end = n !== null ? this.position + n : this.length;
    const out = this.bytes.slice(this.position, end);
    this.position = end;
    return out;
  }
  readInt(n) {
    if (this.position > this.length) return undefined;
    let v = 0;
    for (let i = this.position; i < this.position + n; i++) v = (v << 8) | (this.bytes[i] | 0);
    this.position += n;
    return v;
  }
}

const CONTENT_TYPES = { 20: 'change_cipher_spec', 21: 'alert', 22: 'handshake', 23: 'application_data' };
const HANDSHAKE_TYPES = {
  0: 'hello_request', 1: 'client_hello', 2: 'server_hello', 4: 'new_session_ticket', 11: 'certificate',
  12: 'server_key_exchange', 13: 'certificate_request', 14: 'server_hello_done', 15: 'certificate_verify',
  16: 'client_key_exchange', 20: 'finished',
};

const hex = b => '0x' + hexSep(b);

function readBytesAsHex(c, n) {
  const b = c.getBytes(n);
  if (!b || b.length !== n) return '';
  return hex(b);
}

function readSizePrefixedBytesAsHex(c, prefixLen) {
  const len = c.readInt(prefixLen);
  if (!len) return '';
  return readBytesAsHex(c, len);
}

/** A length-prefixed vector of fixed-width items, rendered as {length, truncated?, values}. */
function readVector(c, prefixLen, itemLen) {
  const out = {};
  out.length = c.readInt(prefixLen);
  if (!out.length) return {};
  const items = new Cursor(c.getBytes(out.length));
  if (items.length < out.length) out.truncated = true;
  out.values = [];
  while (items.hasMore()) {
    const v = readBytesAsHex(items, itemLen);
    if (v) out.values.push(v);
  }
  return out;
}

function readExtension(c) {
  const out = {};
  if (c.position + 4 > c.length) { c.moveTo(c.length); return null; }
  out.type = hex(c.getBytes(2));
  out.length = c.readInt(2);
  if (!out.length) return out;
  const value = c.getBytes(out.length);
  if (!value || value.length !== out.length) out.truncated = true;
  if (value && value.length) out.value = hex(value);
  return out;
}

function readExtensions(c, prefixLen = 2) {
  const out = {};
  out.length = c.readInt(prefixLen);
  if (!out.length) return {};
  const exts = new Cursor(c.getBytes(out.length));
  if (exts.length < out.length) out.truncated = true;
  out.values = [];
  while (exts.hasMore()) {
    const e = readExtension(exts);
    if (e) out.values.push(e);
  }
  return out;
}

function parseClientHello(c) {
  const out = {};
  out.clientVersion = readBytesAsHex(c, 2);
  out.random = readBytesAsHex(c, 32);
  const sessionID = readSizePrefixedBytesAsHex(c, 1);
  if (sessionID) out.sessionID = sessionID;
  out.cipherSuites = readVector(c, 2, 2);
  out.compressionMethods = readVector(c, 1, 1);
  out.extensions = readExtensions(c);
  return out;
}

function parseServerHello(c) {
  const out = {};
  out.serverVersion = readBytesAsHex(c, 2);
  out.random = readBytesAsHex(c, 32);
  const sessionID = readSizePrefixedBytesAsHex(c, 1);
  if (sessionID) out.sessionID = sessionID;
  out.cipherSuite = readBytesAsHex(c, 2);
  out.compressionMethod = readBytesAsHex(c, 1);
  out.extensions = readExtensions(c);
  return out;
}

function parseNewSessionTicket(c) {
  let hint = '';
  if (c.position + 4 > c.length) c.moveTo(c.length);
  else hint = c.readInt(4) + 's';
  return { ticketLifetimeHint: hint, ticket: readSizePrefixedBytesAsHex(c, 2) };
}

function parseCertificate(c) {
  const list = {};
  if (c.position + 3 > c.length) { c.moveTo(c.length); return { certificateList: list }; }
  list.length = c.readInt(3);
  if (!list.length) return { certificateList: list };
  const certs = new Cursor(c.getBytes(list.length));
  if (certs.length < list.length) list.truncated = true;
  list.values = [];
  while (certs.hasMore()) {
    const cert = readSizePrefixedBytesAsHex(certs, 3);
    if (cert) list.values.push(cert);
  }
  return { certificateList: list };
}

function parseCertificateRequest(c) {
  const out = {};
  out.certificateTypes = readVector(c, 1, 1);
  out.supportedSignatureAlgorithms = readVector(c, 2, 2);
  const authorities = {};
  authorities.length = c.readInt(2);
  if (authorities.length) {
    const cas = new Cursor(c.getBytes(authorities.length));
    if (cas.length < authorities.length) authorities.truncated = true;
    authorities.values = [];
    while (cas.hasMore()) {
      const ca = readSizePrefixedBytesAsHex(cas, 2);
      if (ca) authorities.values.push(ca);
    }
    out.certificateAuthorities = authorities;
  }
  return out;
}

function parseCertificateVerify(c) {
  return {
    algorithmHash: readBytesAsHex(c, 1),
    algorithmSignature: readBytesAsHex(c, 1),
    signature: readSizePrefixedBytesAsHex(c, 2),
  };
}

function parseHandshake(c, header) {
  const out = { ...header };
  if (!c.hasMore()) return out;
  const type = c.readInt(1);
  out.handshakeType = HANDSHAKE_TYPES[type] ?? type.toString();
  if (c.position + 3 > c.length) { c.moveTo(c.length); return out; }
  const handshakeLength = c.readInt(3);
  // A handshake that does not fill the record is encrypted (a Finished message, or
  // anything after the ChangeCipherSpec), so the whole record body is opaque.
  if (handshakeLength + 4 !== header.length) {
    c.moveTo(0);
    out.handshakeType = HANDSHAKE_TYPES[20];
    out.handshakeValue = hex(c.bytes);
    return out;
  }
  const content = c.getBytes(handshakeLength);
  if (!content.length) return out;
  const body = new Cursor(content);
  if (type === 1) return { ...out, ...parseClientHello(body) };
  if (type === 2) return { ...out, ...parseServerHello(body) };
  if (type === 4) return { ...out, ...parseNewSessionTicket(body) };
  if (type === 11) return { ...out, ...parseCertificate(body) };
  if (type === 13) return { ...out, ...parseCertificateRequest(body) };
  if (type === 15) return { ...out, ...parseCertificateVerify(body) };
  out.handshakeValue = hex(content);
  return out;
}

function readRecord(c) {
  if (c.position + 5 > c.length) { c.moveTo(c.length); return null; }
  const type = c.readInt(1);
  const header = { type: CONTENT_TYPES[type] ?? type.toString(), version: hex(c.getBytes(2)) };
  header.length = c.readInt(2);
  const content = c.getBytes(header.length);
  if (content.length < header.length) header.truncated = true;
  if (!content.length) return { ...header };
  if (type === 22) return parseHandshake(new Cursor(content), header);
  return { ...header, value: hex(content) };
}

module('Parse TLS record', 'Parses one or more TLS records (handshake messages are decoded field by field), as JSON.',
  [A.select('Input format', ['Raw', 'Hex'])],
  (data, fmt) => {
    const b = rawOrHex(data, fmt);
    const c = new Cursor(b);
    const out = [];
    while (c.hasMore()) {
      const record = readRecord(c);
      if (record) out.push(record);
    }
    return JSON.stringify(out, null, 4);
  });
