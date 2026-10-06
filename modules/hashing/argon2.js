import { module } from './_cat.js';
import { A } from '../../core/registry.js';
import { base64Encode, bytesToHex } from '../../core/util.js';
import { blake2b } from './blake2b.js';

export { argon2, TYPE_D, TYPE_I, TYPE_ID };

const SYNC_POINTS = 4, ADDRESSES_IN_BLOCK = 128;
const TYPE_D = 0, TYPE_I = 1, TYPE_ID = 2;

function le32(n) {
  const b = new Uint8Array(4);
  new DataView(b.buffer).setUint32(0, n, true);
  return b;
}
function concat(arrs) {
  const total = arrs.reduce((s, a) => s + a.length, 0);
  const out = new Uint8Array(total);
  let off = 0;
  for (const a of arrs) { out.set(a, off); off += a.length; }
  return out;
}

function hPrime(input, outlen) {
  if (outlen <= 64) return blake2b(concat([le32(outlen), input]), outlen);
  const out = new Uint8Array(outlen);
  let buf = blake2b(concat([le32(outlen), input]), 64);
  out.set(buf.subarray(0, 32), 0);
  let pos = 32, toproduce = outlen - 32;
  while (toproduce > 64) {
    buf = blake2b(buf, 64);
    out.set(buf.subarray(0, 32), pos);
    pos += 32; toproduce -= 32;
  }
  buf = blake2b(buf, toproduce);
  out.set(buf.subarray(0, toproduce), pos);
  return out;
}

// Blocks are 128 64-bit words held as 256 little-endian 32-bit halves (lo, hi), so the
// compression runs on plain 32-bit integer maths instead of BigInt.
const BLOCK_WORDS = 256;
const V = new Uint32Array(32);
const R = new Uint32Array(BLOCK_WORDS);
const T = new Uint32Array(BLOCK_WORDS);
let mulLo = 0, mulHi = 0;

function mul32(a, b) {
  const al = a & 0xffff, ah = a >>> 16, bl = b & 0xffff, bh = b >>> 16;
  const ll = al * bl, lh = al * bh, hl = ah * bl;
  const mid = (ll >>> 16) + (lh & 0xffff) + (hl & 0xffff);
  mulLo = (((mid & 0xffff) << 16) | (ll & 0xffff)) >>> 0;
  mulHi = (ah * bh + (lh >>> 16) + (hl >>> 16) + (mid >>> 16)) >>> 0;
}
// V[a] = V[a] + V[b] + 2 * lo32(V[a]) * lo32(V[b])  (mod 2^64)
function fBlaMka(a, b) {
  const xl = V[2 * a], xh = V[2 * a + 1], yl = V[2 * b], yh = V[2 * b + 1];
  mul32(xl, yl);
  const pl2 = (mulLo << 1) >>> 0, ph2 = ((mulHi << 1) | (mulLo >>> 31)) >>> 0;
  const lo = xl + yl + pl2;
  V[2 * a] = lo >>> 0;
  V[2 * a + 1] = (xh + yh + ph2 + Math.floor(lo / 4294967296)) >>> 0;
}
// V[d] = rotr64(V[d] ^ V[s], n)
function xorRot(d, s, n) {
  const l = V[2 * d] ^ V[2 * s], h = V[2 * d + 1] ^ V[2 * s + 1];
  if (n === 32) { V[2 * d] = h; V[2 * d + 1] = l; }
  else if (n === 63) { V[2 * d] = (l << 1) | (h >>> 31); V[2 * d + 1] = (h << 1) | (l >>> 31); }
  else { V[2 * d] = (l >>> n) | (h << (32 - n)); V[2 * d + 1] = (h >>> n) | (l << (32 - n)); }
}
function gMix(a, b, c, d) {
  fBlaMka(a, b); xorRot(d, a, 32);
  fBlaMka(c, d); xorRot(b, c, 24);
  fBlaMka(a, b); xorRot(d, a, 16);
  fBlaMka(c, d); xorRot(b, c, 63);
}
const ROUND_IDX = [];
for (let i = 0; i < 8; i++) {
  const o = 16 * i;
  ROUND_IDX.push(Int32Array.from({ length: 16 }, (_, k) => o + k));
}
for (let i = 0; i < 8; i++) {
  const o = 2 * i;
  ROUND_IDX.push(Int32Array.from([o, o + 1, o + 16, o + 17, o + 32, o + 33, o + 48, o + 49, o + 64, o + 65, o + 80, o + 81, o + 96, o + 97, o + 112, o + 113]));
}
function round16(idx) {
  for (let k = 0; k < 16; k++) { V[2 * k] = R[2 * idx[k]]; V[2 * k + 1] = R[2 * idx[k] + 1]; }
  gMix(0, 4, 8, 12); gMix(1, 5, 9, 13); gMix(2, 6, 10, 14); gMix(3, 7, 11, 15);
  gMix(0, 5, 10, 15); gMix(1, 6, 11, 12); gMix(2, 7, 8, 13); gMix(3, 4, 9, 14);
  for (let k = 0; k < 16; k++) { R[2 * idx[k]] = V[2 * k]; R[2 * idx[k] + 1] = V[2 * k + 1]; }
}
function newBlock() { return new Uint32Array(BLOCK_WORDS); }

// next = G(prev, ref) (xor next when withXor); each block is (array, word offset)
function fillBlock(pa, po, ra, ro, na, no, withXor) {
  for (let i = 0; i < BLOCK_WORDS; i++) R[i] = ra[ro + i] ^ pa[po + i];
  T.set(R);
  if (withXor) for (let i = 0; i < BLOCK_WORDS; i++) T[i] ^= na[no + i];
  for (let r = 0; r < 16; r++) round16(ROUND_IDX[r]);
  for (let i = 0; i < BLOCK_WORDS; i++) na[no + i] = T[i] ^ R[i];
}

function nextAddresses(addressBlock, inputBlock, zeroBlock) {
  inputBlock[12] = (inputBlock[12] + 1) >>> 0;
  if (inputBlock[12] === 0) inputBlock[13] = (inputBlock[13] + 1) >>> 0;
  fillBlock(zeroBlock, 0, inputBlock, 0, addressBlock, 0, false);
  fillBlock(zeroBlock, 0, addressBlock, 0, addressBlock, 0, false);
}

function indexAlpha(pass, slice, laneLen, segLen, index, pseudoRand32, sameLane) {
  let referenceAreaSize;
  if (pass === 0) {
    if (slice === 0) referenceAreaSize = index - 1;
    else if (sameLane) referenceAreaSize = slice * segLen + index - 1;
    else referenceAreaSize = slice * segLen + ((index === 0) ? -1 : 0);
  } else {
    if (sameLane) referenceAreaSize = laneLen - segLen + index - 1;
    else referenceAreaSize = laneLen - segLen + ((index === 0) ? -1 : 0);
  }
  const ras = referenceAreaSize >>> 0;
  mul32(pseudoRand32, pseudoRand32);
  mul32(ras, mulHi);
  const rel = ras - 1 - mulHi;
  let startPosition = 0;
  if (pass !== 0) startPosition = (slice === SYNC_POINTS - 1) ? 0 : (slice + 1) * segLen;
  return (startPosition + (rel >>> 0)) % laneLen;
}

function fillSegment(memory, type, pass, lane, slice, laneLength, segmentLength, lanes, memoryBlocks, passes, version) {
  const dataIndependent = (type === TYPE_I) || (type === TYPE_ID && pass === 0 && slice < SYNC_POINTS / 2);
  let addressBlock, inputBlock, zeroBlock;
  if (dataIndependent) {
    zeroBlock = newBlock(); inputBlock = newBlock(); addressBlock = newBlock();
    inputBlock[0] = pass; inputBlock[2] = lane; inputBlock[4] = slice;
    inputBlock[6] = memoryBlocks; inputBlock[8] = passes; inputBlock[10] = type;
  }
  let startingIndex = 0;
  if (pass === 0 && slice === 0) {
    startingIndex = 2;
    if (dataIndependent) nextAddresses(addressBlock, inputBlock, zeroBlock);
  }
  let currOffset = lane * laneLength + slice * segmentLength + startingIndex;
  let prevOffset = (currOffset % laneLength === 0) ? currOffset + laneLength - 1 : currOffset - 1;

  for (let i = startingIndex; i < segmentLength; i++, currOffset++, prevOffset++) {
    if (currOffset % laneLength === 1) prevOffset = currOffset - 1;
    let randLo, randHi;
    if (dataIndependent) {
      if (i % ADDRESSES_IN_BLOCK === 0) nextAddresses(addressBlock, inputBlock, zeroBlock);
      const w = 2 * (i % ADDRESSES_IN_BLOCK);
      randLo = addressBlock[w]; randHi = addressBlock[w + 1];
    } else {
      randLo = memory[prevOffset * BLOCK_WORDS]; randHi = memory[prevOffset * BLOCK_WORDS + 1];
    }
    let refLane = randHi % lanes;
    if (pass === 0 && slice === 0) refLane = lane;
    const sameLane = refLane === lane;
    const refIndex = indexAlpha(pass, slice, laneLength, segmentLength, i, randLo, sameLane);

    const withXor = version !== 0x10 && pass !== 0;
    fillBlock(memory, prevOffset * BLOCK_WORDS, memory, (laneLength * refLane + refIndex) * BLOCK_WORDS,
      memory, currOffset * BLOCK_WORDS, withXor);
  }
}

function argon2(type, password, salt, timeCost, memCost, lanes, hashLen) {
  const version = 0x13;
  let memoryBlocks = memCost;
  if (memoryBlocks < 2 * SYNC_POINTS * lanes) memoryBlocks = 2 * SYNC_POINTS * lanes;
  const segmentLength = Math.floor(memoryBlocks / (lanes * SYNC_POINTS));
  memoryBlocks = segmentLength * lanes * SYNC_POINTS;
  const laneLength = segmentLength * SYNC_POINTS;

  const h0 = blake2b(concat([
    le32(lanes), le32(hashLen), le32(memCost), le32(timeCost), le32(version), le32(type),
    le32(password.length), password, le32(salt.length), salt, le32(0), le32(0),
  ]), 64);

  const memory = new Uint32Array(memoryBlocks * BLOCK_WORDS);
  const load = (bytes, block) => {
    const dv = new DataView(bytes.buffer, bytes.byteOffset, 1024);
    for (let w = 0; w < BLOCK_WORDS; w++) memory[block * BLOCK_WORDS + w] = dv.getUint32(w * 4, true);
  };
  for (let l = 0; l < lanes; l++) {
    load(hPrime(concat([h0, le32(0), le32(l)]), 1024), l * laneLength);
    load(hPrime(concat([h0, le32(1), le32(l)]), 1024), l * laneLength + 1);
  }

  for (let pass = 0; pass < timeCost; pass++) {
    for (let slice = 0; slice < SYNC_POINTS; slice++) {
      for (let lane = 0; lane < lanes; lane++) {
        fillSegment(memory, type, pass, lane, slice, laneLength, segmentLength, lanes, memoryBlocks, timeCost, version);
      }
    }
  }

  const blockhash = memory.slice((laneLength - 1) * BLOCK_WORDS, laneLength * BLOCK_WORDS);
  for (let l = 1; l < lanes; l++) {
    const o = (l * laneLength + laneLength - 1) * BLOCK_WORDS;
    for (let w = 0; w < BLOCK_WORDS; w++) blockhash[w] ^= memory[o + w];
  }
  const bhBytes = new Uint8Array(1024);
  const dv = new DataView(bhBytes.buffer);
  for (let w = 0; w < BLOCK_WORDS; w++) dv.setUint32(w * 4, blockhash[w], true);
  return hPrime(bhBytes, hashLen);
}

const TYPE_NAMES = { Argon2id: ['argon2id', TYPE_ID], Argon2i: ['argon2i', TYPE_I], Argon2d: ['argon2d', TYPE_D] };
const DEFAULT_SALT = new TextEncoder().encode('somesaltsomesalt');
function b64NoPad(u8) { return base64Encode(u8).replace(/=+$/, ''); }

module('Argon2', 'Hashes the input (as a password) with Argon2 (id / i / d).',
  [A.select('Type', ['Argon2id', 'Argon2i', 'Argon2d']), A.number('Time cost', 3, 1), A.number('Memory cost (KiB)', 65536, 8),
   A.number('Parallelism', 4, 1), A.number('Hash length (bytes)', 32, 4), A.toggle('Salt', '', ['UTF8', 'Hex', 'Latin1', 'Base64'], 'UTF8'),
   A.select('Output format', ['Encoded hash', 'Hex hash', 'Raw hash'])],
  (data, kind, t, m, p, length, salt, format) => {
    const [name, type] = TYPE_NAMES[kind];
    const saltBytes = salt.length ? salt : DEFAULT_SALT;
    const out = argon2(type, data, saltBytes, t, m, p, length);
    if (format === 'Hex hash') return bytesToHex(out);
    if (format === 'Raw hash') return out;
    return `$${name}$v=19$m=${m},t=${t},p=${p}$${b64NoPad(saltBytes)}$${b64NoPad(out)}`;
  });
