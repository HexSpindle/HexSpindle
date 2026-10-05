import { module } from './_cat.js';
import { A } from '../../core/registry.js';
import { bytesToHex } from '../../core/util.js';
import { SNEFRU_SBOX } from './_snefru_sbox.js';

function rotr(x, n) { return ((x >>> n) | (x << (32 - n))) >>> 0; }

export function snefru(data, digestBits = 128, rounds = 8) {
  const hashLen = digestBits / 32; // words
  const blockWords = 16 - hashLen;
  const blockBytes = blockWords * 4;

  const msgLen = data.length;
  const total = Math.ceil(msgLen / blockBytes) * blockBytes + blockBytes;
  const buf = new Uint8Array(total);
  buf.set(data, 0);
  const dv = new DataView(buf.buffer);
  const bitLen = BigInt(msgLen) * 8n;
  dv.setUint32(total - 8, Number((bitLen >> 32n) & 0xffffffffn), false);
  dv.setUint32(total - 4, Number(bitLen & 0xffffffffn), false);

  let hash = new Uint32Array(hashLen);
  const W = new Uint32Array(16);
  const ROTS = [16, 8, 16, 24];

  for (let off = 0; off < total; off += blockBytes) {
    for (let i = 0; i < hashLen; i++) W[i] = hash[i];
    for (let i = 0; i < blockWords; i++) W[hashLen + i] = dv.getUint32(off + i * 4, false);

    let sboxOff = 0;
    for (let pass = 0; pass < rounds; pass++) {
      for (const rot of ROTS) {
        for (let i = 0; i < 16; i++) {
          const sbIdx = sboxOff + ((i << 7) & 0x100) + (W[i] & 0xff);
          const x = SNEFRU_SBOX[sbIdx];
          const prev = (i - 1) & 0xf;
          W[prev] ^= x;
          if (i >= 2) W[prev] = rotr(W[prev], rot);
          W[(i + 1) & 0xf] ^= x;
        }
        W[0] = rotr(W[0], rot);
        W[15] = rotr(W[15], rot);
      }
      sboxOff += 512;
    }

    for (let i = 0; i < hashLen; i++) hash[i] = (hash[i] ^ W[15 - i]) >>> 0;
  }

  const out = new Uint8Array(hashLen * 4);
  const odv = new DataView(out.buffer);
  for (let i = 0; i < hashLen; i++) odv.setUint32(i * 4, hash[i], false);
  return out;
}

module('Snefru', 'Snefru: Ralph Merkle\'s 1990 hash function (128 or 256-bit output). Only 2, 4 or 8 main passes are offered; Merkle recommends 8 (the "secure" revision) after Biham and Shamir\'s differential-cryptanalysis attack on the reduced-round versions.',
  [A.select('Size (bits)', ['128', '256']), A.select('Rounds', ['8', '4', '2'])],
  (data, size, rounds) => bytesToHex(snefru(data, parseInt(size, 10), parseInt(rounds, 10))));
