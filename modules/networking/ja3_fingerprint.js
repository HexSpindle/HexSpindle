import { module } from './_cat.js';
import { A } from '../../core/registry.js';
import { parseHello, ja3String } from './_tls.js';
import { rawOrHex } from './_packet.js';
import { md5 } from '../hashing/md5.js';
import { encodeUtf8 } from '../../core/util.js';

module('JA3 Fingerprint', 'Computes the JA3 fingerprint of a TLS ClientHello (MD5 of version,ciphers,extensions,curves,point-formats, with GREASE values stripped) - identifies the TLS client application.',
  [A.select('Input format', ['Raw', 'Hex']), A.select('Output', ['MD5 hash (JA3)', 'Raw string (JA3 input)'])],
  (data, fmt, out) => {
    const b = rawOrHex(data, fmt);
    const info = parseHello(b);
    if (info.type !== 'ClientHello') throw new Error('JA3 is computed from a ClientHello, not a ServerHello (use JA3S for that)');
    const s = ja3String(info);
    return out.startsWith('Raw') ? s : [...md5(encodeUtf8(s))].map(x => x.toString(16).padStart(2, '0')).join('');
  });
