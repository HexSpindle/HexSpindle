import { module } from './_cat.js';
import { A } from '../../core/registry.js';
import { parseHello, ja3sString } from './_tls.js';
import { rawOrHex } from './_packet.js';
import { md5 } from '../hashing/md5.js';
import { encodeUtf8 } from '../../core/util.js';

module('JA3S Fingerprint', 'Computes the JA3S fingerprint of a TLS ServerHello (MD5 of version,cipher,extensions, with GREASE values stripped) - identifies the TLS server stack/configuration.',
  [A.select('Input format', ['Raw', 'Hex']), A.select('Output', ['MD5 hash (JA3S)', 'Raw string (JA3S input)'])],
  (data, fmt, out) => {
    const b = rawOrHex(data, fmt);
    const info = parseHello(b);
    if (info.type !== 'ServerHello') throw new Error('JA3S is computed from a ServerHello, not a ClientHello (use JA3 for that)');
    const s = ja3sString(info);
    return out.startsWith('Raw') ? s : [...md5(encodeUtf8(s))].map(x => x.toString(16).padStart(2, '0')).join('');
  });
