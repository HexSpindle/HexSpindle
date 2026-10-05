import { base64Encode, base64Decode, parseHex, decodeLatin1 } from '../../core/util.js';

export function toPem(der, label) {
  const b64 = base64Encode(der);
  const lines = b64.match(/.{1,64}/g) || [];
  return `-----BEGIN ${label}-----\n${lines.join('\n')}\n-----END ${label}-----\n`;
}

/** Finds the first PEM block in `text` and returns {label, der}, or null if there isn't one. */
export function findPem(text) {
  const m = /-----BEGIN ([^-]+)-----([\s\S]*?)-----END [^-]+-----/.exec(text);
  if (!m) return null;
  return { label: m[1], der: base64Decode(m[2]) };
}

/** Returns every PEM block found in `text`, as [{label, der}]. */
export function findAllPem(text) {
  const out = [];
  const re = /-----BEGIN ([^-]+)-----([\s\S]*?)-----END [^-]+-----/g;
  let m;
  while ((m = re.exec(text))) out.push({ label: m[1], der: base64Decode(m[2]) });
  return out;
}

/** Mirrors core/pki.py's load_der_or_pem: accepts PEM text, hex text, base64 text, or raw DER
 * bytes/Uint8Array, and returns {kind, der}. */
export function loadDerOrPem(data) {
  const txt = data instanceof Uint8Array ? decodeLatin1(data) : data;
  const trimmed = txt.trim();
  const pem = findPem(trimmed);
  if (pem) return { kind: pem.label, der: pem.der };
  if (/^(?:[0-9a-fA-F]{2}[\s:]*)+$/.test(trimmed) && trimmed.replace(/[\s:]/g, '').length % 2 === 0) {
    return { kind: 'HEX', der: parseHex(trimmed) };
  }
  return { kind: 'DER', der: data instanceof Uint8Array ? data : new TextEncoder().encode(data) };
}
