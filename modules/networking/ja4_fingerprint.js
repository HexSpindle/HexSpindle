import { module } from './_cat.js';
import { A } from '../../core/registry.js';
import { parseHelloForJa4, ja4Strings } from './_ja4.js';
import { rawOrHex } from './_packet.js';

module('JA4 Fingerprint', 'Computes the JA4 fingerprint of a TLS ClientHello - the 2023+ successor to JA3, combining plaintext fields (TLS version, SNI presence, cipher/extension counts, ALPN) with truncated-SHA256 hashes of the sorted cipher and extension lists - identifies the TLS client application. GREASE values are ignored throughout. QUIC is not yet supported (TCP is assumed).',
  [A.select('Input format', ['Raw', 'Hex']), A.select('Output', ['JA4', 'JA4 Original Rendering', 'JA4 Raw', 'JA4 Raw Original Rendering', 'All'])],
  async (data, fmt, out) => {
    const b = rawOrHex(data, fmt);
    const info = parseHelloForJa4(b);
    const ja4 = await ja4Strings(info);
    switch (out) {
      case 'JA4': return ja4.JA4;
      case 'JA4 Original Rendering': return ja4.JA4_o;
      case 'JA4 Raw': return ja4.JA4_r;
      case 'JA4 Raw Original Rendering': return ja4.JA4_ro;
      default:
        return `JA4:    ${ja4.JA4}\nJA4_o:  ${ja4.JA4_o}\nJA4_r:  ${ja4.JA4_r}\nJA4_ro: ${ja4.JA4_ro}`;
    }
  });
