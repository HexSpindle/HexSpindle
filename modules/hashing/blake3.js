import { module } from './_cat.js';
import { A } from '../../core/registry.js';
import { bytesToHex } from '../../core/util.js';

const IV = [0x6a09e667, 0xbb67ae85, 0x3c6ef372, 0xa54ff53a, 0x510e527f, 0x9b05688c, 0x1f83d9ab, 0x5be0cd19];
const MSG_PERMUTATION = [2, 6, 3, 10, 7, 0, 4, 13, 1, 11, 12, 5, 9, 14, 15, 8];
const CHUNK_START = 1, CHUNK_END = 2, PARENT = 4, ROOT = 8, KEYED_HASH = 16;
const BLOCK_LEN = 64, CHUNK_LEN = 1024;

const rotr = (x, n) => ((x >>> n) | (x << (32 - n))) >>> 0;

function g(s, a, b, c, d, mx, my) {
  s[a] = (s[a] + s[b] + mx) >>> 0;
  s[d] = rotr(s[d] ^ s[a], 16);
  s[c] = (s[c] + s[d]) >>> 0;
  s[b] = rotr(s[b] ^ s[c], 12);
  s[a] = (s[a] + s[b] + my) >>> 0;
  s[d] = rotr(s[d] ^ s[a], 8);
  s[c] = (s[c] + s[d]) >>> 0;
  s[b] = rotr(s[b] ^ s[c], 7);
}
function roundFn(s, m) {
  g(s, 0, 4, 8, 12, m[0], m[1]); g(s, 1, 5, 9, 13, m[2], m[3]);
  g(s, 2, 6, 10, 14, m[4], m[5]); g(s, 3, 7, 11, 15, m[6], m[7]);
  g(s, 0, 5, 10, 15, m[8], m[9]); g(s, 1, 6, 11, 12, m[10], m[11]);
  g(s, 2, 7, 8, 13, m[12], m[13]); g(s, 3, 4, 9, 14, m[14], m[15]);
}
function permute(m) { return MSG_PERMUTATION.map(i => m[i]); }

function compress(cv, blockWords, counter, blockLen, flags) {
  const lo = Number(counter & 0xffffffffn), hi = Number((counter >> 32n) & 0xffffffffn);
  const state = [...cv, ...IV.slice(0, 4), lo, hi, blockLen, flags];
  let block = blockWords;
  for (let round = 0; round < 7; round++) {
    roundFn(state, block);
    if (round < 6) block = permute(block);
  }
  for (let i = 0; i < 8; i++) { state[i] ^= state[i + 8]; state[i] >>>= 0; state[i + 8] ^= cv[i]; state[i + 8] >>>= 0; }
  return state;
}

function wordsFromBytes(bytes) {
  const words = new Array(16).fill(0);
  const dv = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  for (let i = 0; i < Math.floor(bytes.length / 4); i++) words[i] = dv.getUint32(i * 4, true);
  for (let i = bytes.length - (bytes.length % 4), wi = Math.floor(bytes.length / 4); i < bytes.length; i++) {
    words[wi] |= bytes[i] << ((i - (wi * 4)) * 8);
    words[wi] >>>= 0;
  }
  return words;
}

class Output {
  constructor(cv, blockWords, counter, blockLen, flags) {
    this.cv = cv; this.blockWords = blockWords; this.counter = counter; this.blockLen = blockLen; this.flags = flags;
  }
  chainingValue() { return compress(this.cv, this.blockWords, this.counter, this.blockLen, this.flags).slice(0, 8); }
  rootOutputBytes(outLen) {
    const out = new Uint8Array(outLen);
    let counter = 0n, off = 0;
    while (off < outLen) {
      const words = compress(this.cv, this.blockWords, counter, this.blockLen, this.flags | ROOT);
      const buf = new Uint8Array(64);
      const dv = new DataView(buf.buffer);
      for (let i = 0; i < 16; i++) dv.setUint32(i * 4, words[i], true);
      const n = Math.min(64, outLen - off);
      out.set(buf.subarray(0, n), off);
      off += n; counter += 1n;
    }
    return out;
  }
}

class ChunkState {
  constructor(key, chunkCounter, flags) {
    this.cv = key; this.chunkCounter = BigInt(chunkCounter); this.block = new Uint8Array(BLOCK_LEN);
    this.blockLen = 0; this.blocksCompressed = 0; this.flags = flags;
  }
  len() { return BLOCK_LEN * this.blocksCompressed + this.blockLen; }
  startFlag() { return this.blocksCompressed === 0 ? CHUNK_START : 0; }
  update(input) {
    let off = 0;
    while (off < input.length) {
      if (this.blockLen === BLOCK_LEN) {
        const blockWords = wordsFromBytes(this.block);
        this.cv = compress(this.cv, blockWords, this.chunkCounter, BLOCK_LEN, this.flags | this.startFlag()).slice(0, 8);
        this.blocksCompressed++;
        this.block = new Uint8Array(BLOCK_LEN);
        this.blockLen = 0;
      }
      const want = BLOCK_LEN - this.blockLen;
      const take = Math.min(want, input.length - off);
      this.block.set(input.subarray(off, off + take), this.blockLen);
      this.blockLen += take;
      off += take;
    }
  }
  output() {
    const blockWords = wordsFromBytes(this.block);
    return new Output(this.cv, blockWords, this.chunkCounter, this.blockLen, this.flags | this.startFlag() | CHUNK_END);
  }
}

function parentOutput(leftCv, rightCv, key, flags) {
  return new Output(key, [...leftCv, ...rightCv], 0n, BLOCK_LEN, PARENT | flags);
}

class Hasher {
  constructor(key, flags) {
    this.key = key; this.flags = flags;
    this.chunkState = new ChunkState(key, 0, flags);
    this.cvStack = [];
  }
  addChunkChainingValue(newCv, totalChunks) {
    while ((totalChunks & 1) === 0) {
      newCv = parentOutput(this.cvStack.pop(), newCv, this.key, this.flags).chainingValue();
      totalChunks >>= 1;
    }
    this.cvStack.push(newCv);
  }
  update(input) {
    let off = 0;
    while (off < input.length) {
      if (this.chunkState.len() === CHUNK_LEN) {
        const chunkCv = this.chunkState.output().chainingValue();
        const totalChunks = Number(this.chunkState.chunkCounter) + 1;
        this.addChunkChainingValue(chunkCv, totalChunks);
        this.chunkState = new ChunkState(this.key, totalChunks, this.flags);
      }
      const want = CHUNK_LEN - this.chunkState.len();
      const take = Math.min(want, input.length - off);
      this.chunkState.update(input.subarray(off, off + take));
      off += take;
    }
  }
  finalize(outLen) {
    let output = this.chunkState.output();
    let remaining = this.cvStack.length;
    while (remaining > 0) {
      remaining--;
      output = parentOutput(this.cvStack[remaining], output.chainingValue(), this.key, this.flags);
    }
    return output.rootOutputBytes(outLen);
  }
}

export function blake3(data, outLen = 32, key = null) {
  let keyWords = IV, flags = 0;
  if (key && key.length) {
    if (key.length !== 32) throw new Error('BLAKE3 key must be 32 bytes');
    keyWords = wordsFromBytes(key).slice(0, 8);
    flags = KEYED_HASH;
  }
  const h = new Hasher(keyWords, flags);
  h.update(data);
  return h.finalize(outLen);
}

module('BLAKE3', 'BLAKE3 hash with optional key (32 bytes) and output length.',
  [A.number('Output length (bytes)', 32, 1, 1024), A.toggle('Key (32 bytes, optional)', '', ['UTF8', 'Hex', 'Latin1', 'Base64'])],
  (data, n, key) => bytesToHex(blake3(data, n, key && key.length ? key : null)));
