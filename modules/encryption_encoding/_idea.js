const Q = 65537; // 2^16 + 1 (prime)

function mul(a, b) {
  a = a === 0 ? 0x10000 : a;
  b = b === 0 ? 0x10000 : b;
  let r = (a * b) % Q;
  if (r === 0x10000) r = 0;
  return r & 0xffff;
}
function addMod16(a, b) { return (a + b) & 0xffff; }
function negAdd(a) { return (0x10000 - a) & 0xffff; } // additive inverse mod 2^16

function mulInv(a) {
  const av = a === 0 ? 0x10000 : a;
  let oldR = Q, r = av;
  let oldT = 0, t = 1;
  while (r !== 0) {
    const q = Math.floor(oldR / r);
    [oldR, r] = [r, oldR - q * r];
    [oldT, t] = [t, oldT - q * t];
  }
  let inv = oldT % Q;
  if (inv < 0) inv += Q;
  return inv === 0x10000 ? 0 : inv;
}

export function ideaKeySchedule(key16) {
  if (key16.length !== 16) throw new Error(`IDEA key must be 16 bytes (got ${key16.length})`);
  let bigKey = 0n;
  for (const b of key16) bigKey = (bigKey << 8n) | BigInt(b);
  const MASK128 = (1n << 128n) - 1n;
  const EK = new Uint16Array(52);
  let cur = bigKey, idx = 0;
  while (idx < 52) {
    for (let i = 0; i < 8 && idx < 52; i++, idx++) {
      const shift = BigInt(128 - 16 * (i + 1));
      EK[idx] = Number((cur >> shift) & 0xffffn);
    }
    cur = ((cur << 25n) | (cur >> (128n - 25n))) & MASK128;
  }
  return EK;
}

export function ideaEncryptBlock(EK, block) {
  let x1 = (block[0] << 8) | block[1];
  let x2 = (block[2] << 8) | block[3];
  let x3 = (block[4] << 8) | block[5];
  let x4 = (block[6] << 8) | block[7];
  let k = 0;
  for (let round = 0; round < 8; round++) {
    const a = mul(x1, EK[k++]);
    const b = addMod16(x2, EK[k++]);
    const c = addMod16(x3, EK[k++]);
    const d = mul(x4, EK[k++]);
    const e = a ^ c;
    const f = b ^ d;
    const g = mul(e, EK[k++]);
    const h = addMod16(f, g);
    const i = mul(h, EK[k++]);
    const j = addMod16(g, i);
    x1 = a ^ i; x2 = c ^ i; x3 = b ^ j; x4 = d ^ j;
  }
  const y1 = mul(x1, EK[k++]);
  const y2 = addMod16(x3, EK[k++]);
  const y3 = addMod16(x2, EK[k++]);
  const y4 = mul(x4, EK[k++]);
  const out = new Uint8Array(8);
  out[0] = y1 >>> 8; out[1] = y1 & 0xff;
  out[2] = y2 >>> 8; out[3] = y2 & 0xff;
  out[4] = y3 >>> 8; out[5] = y3 & 0xff;
  out[6] = y4 >>> 8; out[7] = y4 & 0xff;
  return out;
}

export function ideaDecryptBlock(EK, block) {
  let q1 = (block[0] << 8) | block[1];
  let q2 = (block[2] << 8) | block[3];
  let q3 = (block[4] << 8) | block[5];
  let q4 = (block[6] << 8) | block[7];

  let x1 = mul(q1, mulInv(EK[48]));
  let x3 = addMod16(q2, negAdd(EK[49]));
  let x2 = addMod16(q3, negAdd(EK[50]));
  let x4 = mul(q4, mulInv(EK[51]));

  for (let round = 7; round >= 0; round--) {
    const base = round * 6;
    const Z1 = EK[base], Z2 = EK[base + 1], Z3 = EK[base + 2], Z4 = EK[base + 3], Z5 = EK[base + 4], Z6 = EK[base + 5];
    const Q1 = x1, Q2 = x2, Q3 = x3, Q4 = x4;
    const e = Q1 ^ Q2, f = Q3 ^ Q4;
    const g = mul(e, Z5);
    const h = addMod16(f, g);
    const i = mul(h, Z6);
    const j = addMod16(g, i);
    const a = Q1 ^ i, c = Q2 ^ i, b = Q3 ^ j, d = Q4 ^ j;
    x1 = mul(a, mulInv(Z1));
    x2 = addMod16(b, negAdd(Z2));
    x3 = addMod16(c, negAdd(Z3));
    x4 = mul(d, mulInv(Z4));
  }

  const out = new Uint8Array(8);
  out[0] = x1 >>> 8; out[1] = x1 & 0xff;
  out[2] = x2 >>> 8; out[3] = x2 & 0xff;
  out[4] = x3 >>> 8; out[5] = x3 & 0xff;
  out[6] = x4 >>> 8; out[7] = x4 & 0xff;
  return out;
}

export const IDEA = { blockSize: 8, keySchedule: ideaKeySchedule, encryptBlock: ideaEncryptBlock, decryptBlock: ideaDecryptBlock };
