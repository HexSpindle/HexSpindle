import { module } from './_cat.js';
import { A } from '../../core/registry.js';
import { parseHelloForJa4, ja4sStrings } from './_ja4.js';
import { rawOrHex } from './_packet.js';

module('JA4Server Fingerprint', 'Computes the JA4S (JA4Server) fingerprint of a TLS ServerHello - the 2023+ successor to JA3S, combining plaintext fields (TLS version, extension count, ALPN, chosen cipher) with a truncated-SHA256 hash of the extension list (in the order the server sent them) - identifies the TLS server stack/configuration. QUIC is not yet supported (TCP is assumed).',
  [A.select('Input format', ['Raw', 'Hex']), A.select('Output', ['JA4S', 'JA4S Raw', 'Both'])],
  async (data, fmt, out) => {
    const b = rawOrHex(data, fmt);
    const info = parseHelloForJa4(b);
    const ja4s = await ja4sStrings(info);
    switch (out) {
      case 'JA4S': return ja4s.JA4S;
      case 'JA4S Raw': return ja4s.JA4S_r;
      default: return `JA4S:   ${ja4s.JA4S}\nJA4S_r: ${ja4s.JA4S_r}`;
    }
  });
