function rotl(x, c) { return (x << c) | (x >>> (32 - c)); }

const MD5_S = [7, 12, 17, 22, 7, 12, 17, 22, 7, 12, 17, 22, 7, 12, 17, 22,
  5, 9, 14, 20, 5, 9, 14, 20, 5, 9, 14, 20, 5, 9, 14, 20,
  4, 11, 16, 23, 4, 11, 16, 23, 4, 11, 16, 23, 4, 11, 16, 23,
  6, 10, 15, 21, 6, 10, 15, 21, 6, 10, 15, 21, 6, 10, 15, 21];
const MD5_K = Array.from({ length: 64 }, (_, i) => (Math.abs(Math.sin(i + 1)) * 4294967296) >>> 0);

export function md5(u8) {
  const msgLen = u8.length;
  const padded = new Uint8Array((msgLen + 9 + 63) & ~63);
  padded.set(u8);
  padded[msgLen] = 0x80;
  const bitLen = BigInt(msgLen) * 8n;
  const dv = new DataView(padded.buffer);
  dv.setUint32(padded.length - 8, Number(bitLen & 0xffffffffn), true);
  dv.setUint32(padded.length - 4, Number((bitLen >> 32n) & 0xffffffffn), true);

  let [a0, b0, c0, d0] = [0x67452301, 0xefcdab89, 0x98badcfe, 0x10325476];
  for (let chunk = 0; chunk < padded.length; chunk += 64) {
    const M = [];
    for (let j = 0; j < 16; j++) M.push(dv.getUint32(chunk + j * 4, true));
    let [A, B, C, D] = [a0, b0, c0, d0];
    for (let i = 0; i < 64; i++) {
      let F, g;
      if (i < 16) { F = (B & C) | (~B & D); g = i; }
      else if (i < 32) { F = (D & B) | (~D & C); g = (5 * i + 1) % 16; }
      else if (i < 48) { F = B ^ C ^ D; g = (3 * i + 5) % 16; }
      else { F = C ^ (B | ~D); g = (7 * i) % 16; }
      F = (F + A + MD5_K[i] + M[g]) | 0;
      A = D; D = C; C = B;
      B = (B + rotl(F, MD5_S[i])) | 0;
    }
    a0 = (a0 + A) | 0; b0 = (b0 + B) | 0; c0 = (c0 + C) | 0; d0 = (d0 + D) | 0;
  }
  const out = new Uint8Array(16);
  const odv = new DataView(out.buffer);
  odv.setUint32(0, a0 >>> 0, true); odv.setUint32(4, b0 >>> 0, true);
  odv.setUint32(8, c0 >>> 0, true); odv.setUint32(12, d0 >>> 0, true);
  return out;
}

const SHA2_K = [
  0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5, 0x3956c25b, 0x59f111f1, 0x923f82a4, 0xab1c5ed5,
  0xd807aa98, 0x12835b01, 0x243185be, 0x550c7dc3, 0x72be5d74, 0x80deb1fe, 0x9bdc06a7, 0xc19bf174,
  0xe49b69c1, 0xefbe4786, 0x0fc19dc6, 0x240ca1cc, 0x2de92c6f, 0x4a7484aa, 0x5cb0a9dc, 0x76f988da,
  0x983e5152, 0xa831c66d, 0xb00327c8, 0xbf597fc7, 0xc6e00bf3, 0xd5a79147, 0x06ca6351, 0x14292967,
  0x27b70a85, 0x2e1b2138, 0x4d2c6dfc, 0x53380d13, 0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85,
  0xa2bfe8a1, 0xa81a664b, 0xc24b8b70, 0xc76c51a3, 0xd192e819, 0xd6990624, 0xf40e3585, 0x106aa070,
  0x19a4c116, 0x1e376c08, 0x2748774c, 0x34b0bcb5, 0x391c0cb3, 0x4ed8aa4a, 0x5b9cca4f, 0x682e6ff3,
  0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208, 0x90befffa, 0xa4506ceb, 0xbef9a3f7, 0xc67178f2];
const SHA224_IV = [0xc1059ed8, 0x367cd507, 0x3070dd17, 0xf70e5939, 0xffc00b31, 0x68581511, 0x64f98fa7, 0xbefa4fa4];

export function sha224(u8) {
  const msgLen = u8.length;
  const padded = new Uint8Array((((msgLen + 9 + 63) & ~63)));
  padded.set(u8);
  padded[msgLen] = 0x80;
  const bitLen = BigInt(msgLen) * 8n;
  const dv = new DataView(padded.buffer);
  dv.setUint32(padded.length - 8, Number((bitLen >> 32n) & 0xffffffffn));
  dv.setUint32(padded.length - 4, Number(bitLen & 0xffffffffn));

  let h = SHA224_IV.slice();
  const w = new Uint32Array(64);
  for (let chunk = 0; chunk < padded.length; chunk += 64) {
    for (let t = 0; t < 16; t++) w[t] = dv.getUint32(chunk + t * 4);
    for (let t = 16; t < 64; t++) {
      const s0 = rotl(w[t - 15], 25) ^ rotl(w[t - 15], 14) ^ (w[t - 15] >>> 3);
      const s1 = rotl(w[t - 2], 15) ^ rotl(w[t - 2], 13) ^ (w[t - 2] >>> 10);
      w[t] = (w[t - 16] + s0 + w[t - 7] + s1) | 0;
    }
    let [a, b, c, d, e, f, g, hh] = h;
    for (let t = 0; t < 64; t++) {
      const S1 = rotl(e, 26) ^ rotl(e, 21) ^ rotl(e, 7);
      const ch = (e & f) ^ (~e & g);
      const temp1 = (hh + S1 + ch + SHA2_K[t] + w[t]) | 0;
      const S0 = rotl(a, 30) ^ rotl(a, 19) ^ rotl(a, 10);
      const maj = (a & b) ^ (a & c) ^ (b & c);
      const temp2 = (S0 + maj) | 0;
      hh = g; g = f; f = e; e = (d + temp1) | 0;
      d = c; c = b; b = a; a = (temp1 + temp2) | 0;
    }
    h = [h[0] + a, h[1] + b, h[2] + c, h[3] + d, h[4] + e, h[5] + f, h[6] + g, h[7] + hh].map(x => x | 0);
  }
  const out = new Uint8Array(28);
  const odv = new DataView(out.buffer);
  for (let i = 0; i < 7; i++) odv.setUint32(i * 4, h[i] >>> 0);
  return out;
}

export const DIGESTS = {
  md5: { fn: md5, blockSize: 64, size: 16 },
  sha224: { fn: sha224, blockSize: 64, size: 28 },
};

function xorBytes(a, b) { const out = new Uint8Array(a.length); for (let i = 0; i < a.length; i++) out[i] = a[i] ^ b[i]; return out; }
function concatAll(...parts) {
  const total = parts.reduce((n, p) => n + p.length, 0);
  const out = new Uint8Array(total);
  let off = 0;
  for (const p of parts) { out.set(p, off); off += p.length; }
  return out;
}

export function hmacGeneric(name, key, msg) {
  const { fn, blockSize } = DIGESTS[name];
  let k = key.length > blockSize ? fn(key) : key;
  if (k.length < blockSize) { const padded = new Uint8Array(blockSize); padded.set(k); k = padded; }
  const opad = new Uint8Array(blockSize), ipad = new Uint8Array(blockSize);
  for (let i = 0; i < blockSize; i++) { opad[i] = k[i] ^ 0x5c; ipad[i] = k[i] ^ 0x36; }
  return fn(concatAll(opad, fn(concatAll(ipad, msg))));
}

export function pbkdf2Generic(name, password, salt, iterations, dkLen) {
  const { size } = DIGESTS[name];
  const numBlocks = Math.ceil(dkLen / size);
  const dk = new Uint8Array(numBlocks * size);
  for (let i = 1; i <= numBlocks; i++) {
    const intBlock = new Uint8Array(4);
    new DataView(intBlock.buffer).setUint32(0, i);
    let u = hmacGeneric(name, password, concatAll(salt, intBlock));
    let t = u;
    for (let j = 1; j < iterations; j++) {
      u = hmacGeneric(name, password, u);
      t = xorBytes(t, u);
    }
    dk.set(t, (i - 1) * size);
  }
  return dk.slice(0, dkLen);
}
