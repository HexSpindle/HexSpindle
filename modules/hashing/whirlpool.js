import { module } from './_cat.js';
import { A } from '../../core/registry.js';
import { bytesToHex } from '../../core/util.js';
import { RC, C0, C1, C2, C3, C4, C5, C6, C7 } from './_whirlpool_tables.js';

const MASK = 0xffffffffffffffffn;

function transform(state, block, rounds) {
  const K = new BigUint64Array(8);
  const S = new BigUint64Array(8);
  for (let i = 0; i < 8; i++) { K[i] = state[i]; S[i] = block[i] ^ state[i]; }
  const L = new BigUint64Array(8);
  const b = (x, n) => Number((x >> BigInt(n)) & 0xffn);

  for (let r = 1; r <= rounds; r++) {
    for (let i = 0; i < 8; i++) {
      L[i] = C0[b(K[i % 8], 56)] ^ C1[b(K[(i + 7) % 8], 48)] ^ C2[b(K[(i + 6) % 8], 40)] ^
        C3[b(K[(i + 5) % 8], 32)] ^ C4[b(K[(i + 4) % 8], 24)] ^ C5[b(K[(i + 3) % 8], 16)] ^
        C6[b(K[(i + 2) % 8], 8)] ^ C7[b(K[(i + 1) % 8], 0)];
    }
    L[0] ^= RC[r];
    for (let i = 0; i < 8; i++) K[i] = L[i];

    for (let i = 0; i < 8; i++) {
      L[i] = (C0[b(S[i % 8], 56)] ^ C1[b(S[(i + 7) % 8], 48)] ^ C2[b(S[(i + 6) % 8], 40)] ^
        C3[b(S[(i + 5) % 8], 32)] ^ C4[b(S[(i + 4) % 8], 24)] ^ C5[b(S[(i + 3) % 8], 16)] ^
        C6[b(S[(i + 2) % 8], 8)] ^ C7[b(S[(i + 1) % 8], 0)]) ^ K[i];
    }
    for (let i = 0; i < 8; i++) S[i] = L[i];
  }
  for (let i = 0; i < 8; i++) state[i] = (state[i] ^ S[i] ^ block[i]) & MASK;
}

export function whirlpool(data, rounds = 10) {
  const msgLen = data.length;
  const bitLen = BigInt(msgLen) * 8n;
  let padLen = 64 - ((msgLen + 1) % 64);
  if (padLen < 32) padLen += 64;
  padLen -= 32;
  const total = msgLen + 1 + padLen + 32;
  const padded = new Uint8Array(total);
  padded.set(data, 0);
  padded[msgLen] = 0x80;
  const dv = new DataView(padded.buffer);
  dv.setBigUint64(total - 8, bitLen, false);

  const state = new BigUint64Array(8);
  const block = new BigUint64Array(8);
  for (let off = 0; off < total; off += 64) {
    for (let i = 0; i < 8; i++) block[i] = dv.getBigUint64(off + i * 8, false);
    transform(state, block, rounds);
  }

  const out = new Uint8Array(64);
  const odv = new DataView(out.buffer);
  for (let i = 0; i < 8; i++) odv.setBigUint64(i * 8, state[i], false);
  return out;
}

module('Whirlpool', 'Whirlpool (ISO/IEC 10118-3): a 512-bit cryptographic hash designed by Barreto and Rijmen, built from a dedicated AES-like block cipher. Implements the final (2003) revision; the "Rounds" option can reduce the block cipher below its standard 10 rounds.',
  [A.number('Rounds', 10, 1, 10)],
  (data, rounds) => bytesToHex(whirlpool(data, Math.floor(rounds))));
