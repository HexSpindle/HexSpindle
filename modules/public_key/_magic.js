// Magic hints for certificate and key operations.
import { analyses, needsKey, count } from '../../core/magic-detect.js';

const pem = label => ({ isText, head }) => isText && new RegExp(`-----BEGIN ${label}-----`).test(head);

analyses('Parse X.509 certificate', ctx => pem('CERTIFICATE')(ctx) && count(ctx.text, /-----BEGIN CERTIFICATE-----/g) === 1 ? { fit: 0.95, args: ['PEM'] } : null);
analyses('Parse X.509 certificate bundles', ctx => pem('CERTIFICATE')(ctx) && count(ctx.text, /-----BEGIN CERTIFICATE-----/g) > 1 ? 0.95 : null);
analyses('Parse CSR', ctx => pem('(?:NEW )?CERTIFICATE REQUEST')(ctx) ? { fit: 0.95, args: ['PEM'] } : null);
analyses('Parse X.509 CRL', ctx => pem('X509 CRL')(ctx) ? { fit: 0.95, args: ['PEM'] } : null);
analyses('Parse PGP Key', ctx => pem('PGP (?:PUBLIC|PRIVATE) KEY BLOCK')(ctx) ? 0.95 : null);
analyses('PEM to JWK', ctx => pem('(?:RSA |EC )?(?:PUBLIC|PRIVATE) KEY')(ctx) ? 0.7 : null);
analyses('Parse SSH Host Key', ({ isText, head }) => isText && /^(?:ssh-(?:rsa|dss|ed25519)|ecdsa-sha2-nistp\d+) AAAA[A-Za-z0-9+/]+/.test(head) ? { fit: 0.9, args: ['Auto', false] } : null);

// DER: a SEQUENCE whose declared length accounts for the whole input.
const derLength = (b0, b1, b2, b3) => b0 !== 0x30 ? -1 : b1 === 0x82 ? 4 + ((b2 << 8) | b3) : b1 === 0x81 ? 3 + b2 : b1 < 0x80 ? 2 + b1 : -1;
analyses('Parse ASN.1 hex string', ({ isText, bytes, single, compact }) => {
  if (!isText) return bytes.length >= 8 && derLength(bytes[0], bytes[1], bytes[2], bytes[3]) === bytes.length ? { fit: 0.85, args: [0, true, 'Raw', 32] } : null;
  if (!single || compact.length < 16 || compact.length % 2 || !/^30[0-9a-f]+$/i.test(compact)) return null;
  const b = i => parseInt(compact.substr(i * 2, 2), 16);
  return derLength(b(0), b(1), b(2), b(3)) === compact.length / 2 ? { fit: 0.85, args: [0, true, 'Hex', 32] } : null;
});

needsKey('PGP Decrypt', 'private key', ctx => pem('PGP MESSAGE')(ctx) ? 0.95 : null);
needsKey('PGP Verify', 'public key', ctx => pem('PGP SIGNED MESSAGE')(ctx) ? 0.9 : null);
