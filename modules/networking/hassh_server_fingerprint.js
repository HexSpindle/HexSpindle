import { module } from './_cat.js';
import { A } from '../../core/registry.js';
import { parseKexinit } from './_ssh.js';
import { rawOrHex } from './_packet.js';
import { md5 } from '../hashing/md5.js';
import { encodeUtf8 } from '../../core/util.js';

module('HASSH Server Fingerprint', 'Computes the HASSH fingerprint of an SSH server from its KEXINIT packet (MD5 of kex;enc_s2c;mac_s2c;comp_s2c) - identifies the SSH server application/library.',
  [A.select('Input format', ['Raw', 'Hex'])],
  (data, fmt) => {
    const b = rawOrHex(data, fmt);
    const f = parseKexinit(b);
    const s = [f.kex_algorithms, f.encryption_algorithms_server_to_client, f.mac_algorithms_server_to_client, f.compression_algorithms_server_to_client].join(';');
    return [...md5(encodeUtf8(s))].map(x => x.toString(16).padStart(2, '0')).join('');
  });
