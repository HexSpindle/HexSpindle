import { module } from './_cat.js';
import { A } from '../../core/registry.js';
import { parseKexinit } from './_ssh.js';
import { rawOrHex } from './_packet.js';
import { md5 } from '../hashing/md5.js';
import { encodeUtf8 } from '../../core/util.js';

module('HASSH Client Fingerprint', 'Computes the HASSH fingerprint of an SSH client from its KEXINIT packet (MD5 of kex;enc_c2s;mac_c2s;comp_c2s) - identifies the SSH client application/library.',
  [A.select('Input format', ['Raw', 'Hex'])],
  (data, fmt) => {
    const b = rawOrHex(data, fmt);
    const f = parseKexinit(b);
    const s = [f.kex_algorithms, f.encryption_algorithms_client_to_server, f.mac_algorithms_client_to_server, f.compression_algorithms_client_to_server].join(';');
    return [...md5(encodeUtf8(s))].map(x => x.toString(16).padStart(2, '0')).join('');
  });
