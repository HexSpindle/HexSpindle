import { module } from './_cat.js';
import { A } from '../../core/registry.js';
import { bytesToHex, encodeUtf8 } from '../../core/util.js';
import { md6 } from './md6.js';
import { sha3 } from './sha3.js';
import { keccak } from './keccak.js';
import { shake } from './shake.js';
import { blake2b } from './blake2b.js';
import { blake2s } from './blake2s.js';
import { streebog } from './streebog.js';
import { lmHash } from './lm_hash.js';
import { ntHash } from './nt_hash.js';
import { ssdeepDigest } from './_ssdeep.js';
import { ctphDigest } from './_ctph.js';
import { runHash, gostHash, byteString } from './_hash_util.js';

export async function generateAllHashes(data) {
  const str = byteString(data);
  const rows = [];
  const rh = async (name, n, opts) => rows.push([name, await runHash(n, data, opts)]);
  await rh('MD2', 'md2', { rounds: undefined });
  await rh('MD4', 'md4');
  await rh('MD5', 'md5');
  rows.push(['MD6', bytesToHex(new Uint8Array(md6(256, Array.from(encodeUtf8(str)), [], 64)))]);
  await rh('SHA0', 'sha0', { rounds: undefined });
  await rh('SHA1', 'sha1', { rounds: undefined });
  for (const s of ['224', '256', '384', '512']) await rh(`SHA2 ${s}`, `sha${s}`, { rounds: undefined });
  for (const s of [224, 256, 384, 512]) rows.push([`SHA3 ${s}`, bytesToHex(sha3(data, s))]);
  for (const s of [224, 256, 384, 512]) rows.push([`Keccak ${s}`, bytesToHex(keccak(data, s))]);
  rows.push(['Shake 128', bytesToHex(shake(data, 256, 32))]);
  rows.push(['Shake 256', bytesToHex(shake(data, 512, 64))]);
  for (const s of ['128', '160', '256', '320']) await rh(`RIPEMD-${s}`, `ripemd${s}`);
  await rh('HAS-160', 'has160', { rounds: undefined });
  for (const v of ['Whirlpool-0', 'Whirlpool-T', 'Whirlpool']) await rh(v, v.toLowerCase(), { rounds: undefined });
  for (const s of [128, 160, 256, 384, 512]) rows.push([`BLAKE2b-${s}`, bytesToHex(blake2b(data, s / 8))]);
  for (const s of [128, 160, 256]) rows.push([`BLAKE2s-${s}`, bytesToHex(blake2s(data, s / 8))]);
  rows.push(['Streebog-256', bytesToHex(streebog(data, 256))]);
  rows.push(['Streebog-512', bytesToHex(streebog(data, 512))]);
  rows.push(['GOST', await gostHash(data, { version: 1994, sBox: 'D-A' })]);
  rows.push(['LM Hash', bytesToHex(lmHash(str)).toUpperCase()]);
  rows.push(['NT Hash', bytesToHex(ntHash(str)).toUpperCase()]);
  // ssdeep.js / ctph.js UTF-8-encode the string they are given (as node-md6 does).
  rows.push(['SSDEEP', ssdeepDigest(encodeUtf8(str))]);
  rows.push(['CTPH', ctphDigest(encodeUtf8(str))]);
  return rows;
}

module('Generate all hashes', 'Generates all available hashes and checksums for the input (43 algorithms). "Length (bits)" keeps only digests of that size.',
  [A.boolean('Include names', true), A.select('Length (bits)', ['All', '128', '160', '224', '256', '320', '384', '512'])],
  async (data, names, length = 'All') => {
    const rows = await generateAllHashes(data);
    let out = '';
    for (const [name, digest] of rows) {
      if (length !== 'All' && digest.length * 4 !== parseInt(length, 10)) continue;
      out += names ? `${name}:${' '.repeat(13 - name.length)}${digest}\n` : `${digest}\n`;
    }
    return out;
  });
