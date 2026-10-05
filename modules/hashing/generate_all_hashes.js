import { module } from './_cat.js';
import { A } from '../../core/registry.js';
import { bytesToHex } from '../../core/util.js';
import { md5 } from './md5.js';
import { md4 } from './md4.js';
import { md2 } from './md2.js';
import { ripemd160 } from './ripemd.js';
import { sha3 } from './sha3.js';
import { shake } from './shake.js';
import { blake2b } from './blake2b.js';
import { blake2s } from './blake2s.js';
import { sm3 } from './sm3.js';
import { adler32 } from './adler32_checksum.js';
import { crc32 } from './crc32_checksum.js';

async function webDigest(data, algo) { return bytesToHex(new Uint8Array(await crypto.subtle.digest(algo, data))); }

export async function generateAllHashes(data) {
  const rows = [];
  rows.push(['MD5', bytesToHex(md5(data))]);
  rows.push(['SHA1', await webDigest(data, 'SHA-1')]);
  rows.push(['SHA256', await webDigest(data, 'SHA-256')]);
  rows.push(['SHA384', await webDigest(data, 'SHA-384')]);
  rows.push(['SHA512', await webDigest(data, 'SHA-512')]);
  rows.push(['SHA3-224', bytesToHex(sha3(data, 224))]);
  rows.push(['SHA3-256', bytesToHex(sha3(data, 256))]);
  rows.push(['SHA3-384', bytesToHex(sha3(data, 384))]);
  rows.push(['SHA3-512', bytesToHex(sha3(data, 512))]);
  rows.push(['BLAKE2B', bytesToHex(blake2b(data, 64))]);
  rows.push(['BLAKE2S', bytesToHex(blake2s(data, 32))]);
  rows.push(['SM3', bytesToHex(sm3(data))]);
  rows.push(['RIPEMD160', bytesToHex(ripemd160(data))]);
  rows.push(['MD2', bytesToHex(md2(data))]);
  rows.push(['MD4', bytesToHex(md4(data))]);
  rows.push(['SHAKE128', bytesToHex(shake(data, 256, 16))]);
  rows.push(['SHAKE256', bytesToHex(shake(data, 512, 32))]);
  rows.push(['Adler-32', adler32(data).toString(16).padStart(8, '0')]);
  rows.push(['CRC-32', crc32(data).toString(16).padStart(8, '0')]);
  return rows;
}

module('Generate all hashes', "Computes the input's digest under every supported hash algorithm.", [A.boolean('Include names', true)],
  async (data, names) => {
    const rows = await generateAllHashes(data);
    return rows.map(([k, v]) => (names ? `${k}: ` : '') + v).join('\n');
  });
