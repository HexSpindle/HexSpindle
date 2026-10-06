import { module } from './_cat.js';
import { A } from '../../core/registry.js';
import { base64Encode, bytesToHex } from '../../core/util.js';
import { blake2b } from './blake2b.js';

export { argon2, TYPE_D, TYPE_I, TYPE_ID };

const MASK64 = (1n << 64n) - 1n;
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

function fBlaMka(x, y) {
  const m = 0xffffffffn;
  return (x + y + 2n * ((x & m) * (y & m))) & MASK64;
}
function rotr64(x, n) { return ((x >> BigInt(n)) | (x << BigInt(64 - n))) & MASK64; }
function gMix(v, a, b, c, d) {
  v[a] = fBlaMka(v[a], v[b]); v[d] = rotr64(v[d] ^ v[a], 32);
  v[c] = fBlaMka(v[c], v[d]); v[b] = rotr64(v[b] ^ v[c], 24);
  v[a] = fBlaMka(v[a], v[b]); v[d] = rotr64(v[d] ^ v[a], 16);
  v[c] = fBlaMka(v[c], v[d]); v[b] = rotr64(v[b] ^ v[c], 63);
}
function round16(v, idx) {
  const tmp = idx.map(i => v[i]);
  gMix(tmp, 0, 4, 8, 12); gMix(tmp, 1, 5, 9, 13); gMix(tmp, 2, 6, 10, 14); gMix(tmp, 3, 7, 11, 15);
  gMix(tmp, 0, 5, 10, 15); gMix(tmp, 1, 6, 11, 12); gMix(tmp, 2, 7, 8, 13); gMix(tmp, 3, 4, 9, 14);
  for (let k = 0; k < 16; k++) v[idx[k]] = tmp[k];
}
function newBlock() { return new BigUint64Array(128); }

function fillBlock(prev, ref, next, withXor) {
  const blockR = newBlock();
  for (let i = 0; i < 128; i++) blockR[i] = ref[i] ^ prev[i];
  const blockTmp = newBlock();
  blockTmp.set(blockR);
  if (withXor) for (let i = 0; i < 128; i++) blockTmp[i] ^= next[i];
  for (let i = 0; i < 8; i++) {
    const o = 16 * i;
    round16(blockR, [o,o+1,o+2,o+3,o+4,o+5,o+6,o+7,o+8,o+9,o+10,o+11,o+12,o+13,o+14,o+15]);
  }
  for (let i = 0; i < 8; i++) {
    const o = 2 * i;
    round16(blockR, [o,o+1,o+16,o+17,o+32,o+33,o+48,o+49,o+64,o+65,o+80,o+81,o+96,o+97,o+112,o+113]);
  }
  for (let i = 0; i < 128; i++) next[i] = blockTmp[i] ^ blockR[i];
}

function nextAddresses(addressBlock, inputBlock, zeroBlock) {
  inputBlock[6] = (inputBlock[6] + 1n) & MASK64;
  fillBlock(zeroBlock, inputBlock, addressBlock, false);
  fillBlock(zeroBlock, addressBlock, addressBlock, false);
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
  const ras = BigInt.asUintN(32, BigInt(referenceAreaSize));
  let rel = BigInt(pseudoRand32);
  rel = (rel * rel) >> 32n;
  rel = ras - 1n - ((ras * rel) >> 32n);
  let startPosition = 0;
  if (pass !== 0) startPosition = (slice === SYNC_POINTS - 1) ? 0 : (slice + 1) * segLen;
  return Number((BigInt(startPosition) + (rel & 0xffffffffn)) % BigInt(laneLen));
}

function fillSegment(memory, type, pass, lane, slice, laneLength, segmentLength, lanes, memoryBlocks, passes, version) {
  const dataIndependent = (type === TYPE_I) || (type === TYPE_ID && pass === 0 && slice < SYNC_POINTS / 2);
  let addressBlock, inputBlock, zeroBlock;
  if (dataIndependent) {
    zeroBlock = newBlock(); inputBlock = newBlock(); addressBlock = newBlock();
    inputBlock[0] = BigInt(pass); inputBlock[1] = BigInt(lane); inputBlock[2] = BigInt(slice);
    inputBlock[3] = BigInt(memoryBlocks); inputBlock[4] = BigInt(passes); inputBlock[5] = BigInt(type);
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
    let pseudoRand;
    if (dataIndependent) {
      if (i % ADDRESSES_IN_BLOCK === 0) nextAddresses(addressBlock, inputBlock, zeroBlock);
      pseudoRand = addressBlock[i % ADDRESSES_IN_BLOCK];
    } else {
      pseudoRand = memory[prevOffset][0];
    }
    let refLane = Number((pseudoRand >> 32n) % BigInt(lanes));
    if (pass === 0 && slice === 0) refLane = lane;
    const sameLane = refLane === lane;
    const refIndex = indexAlpha(pass, slice, laneLength, segmentLength, i, Number(pseudoRand & 0xffffffffn), sameLane);

    const refBlock = memory[laneLength * refLane + refIndex];
    const currBlock = memory[currOffset];
    const prevBlock = memory[prevOffset];
    if (version === 0x10) fillBlock(prevBlock, refBlock, currBlock, false);
    else fillBlock(prevBlock, refBlock, currBlock, pass !== 0);
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

  const memory = [];
  for (let i = 0; i < memoryBlocks; i++) memory.push(newBlock());

  for (let l = 0; l < lanes; l++) {
    const b0 = hPrime(concat([h0, le32(0), le32(l)]), 1024);
    const dv0 = new DataView(b0.buffer, b0.byteOffset, 1024);
    for (let w = 0; w < 128; w++) memory[l * laneLength][w] = dv0.getBigUint64(w * 8, true);
    const b1 = hPrime(concat([h0, le32(1), le32(l)]), 1024);
    const dv1 = new DataView(b1.buffer, b1.byteOffset, 1024);
    for (let w = 0; w < 128; w++) memory[l * laneLength + 1][w] = dv1.getBigUint64(w * 8, true);
  }

  for (let pass = 0; pass < timeCost; pass++) {
    for (let slice = 0; slice < SYNC_POINTS; slice++) {
      for (let lane = 0; lane < lanes; lane++) {
        fillSegment(memory, type, pass, lane, slice, laneLength, segmentLength, lanes, memoryBlocks, timeCost, version);
      }
    }
  }

  const blockhash = newBlock();
  blockhash.set(memory[laneLength - 1]);
  for (let l = 1; l < lanes; l++) {
    const b = memory[l * laneLength + (laneLength - 1)];
    for (let w = 0; w < 128; w++) blockhash[w] ^= b[w];
  }
  const bhBytes = new Uint8Array(1024);
  const dv = new DataView(bhBytes.buffer);
  for (let w = 0; w < 128; w++) dv.setBigUint64(w * 8, blockhash[w], true);
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
