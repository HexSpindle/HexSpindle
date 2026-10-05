const MASK = 0xffffffffffffffffn;
function rotr(x, n) { x &= MASK; return ((x >> n) | (x << (64n - n))) & MASK; }

/** In-place 12-round Ascon permutation over a 5-element BigUint64Array state. */
export function asconPermutation(s, rounds = 12) {
  for (let r = 12 - rounds; r < 12; r++) {
    const C = BigInt(0xf0 - r * 0x10 + r);
    s[2] ^= C;
    s[0] ^= s[4]; s[4] ^= s[3]; s[2] ^= s[1];
    const t0 = s[0] ^ (~s[1] & s[2]);
    const t1 = s[1] ^ (~s[2] & s[3]);
    const t2 = s[2] ^ (~s[3] & s[4]);
    const t3 = s[3] ^ (~s[4] & s[0]);
    const t4 = s[4] ^ (~s[0] & s[1]);
    const u0 = t0 ^ t4, u1 = t1 ^ t0, u2 = ~t2 & MASK, u3 = t3 ^ t2, u4 = t4;
    s[0] = u0 ^ rotr(u0, 19n) ^ rotr(u0, 28n);
    s[1] = u1 ^ rotr(u1, 61n) ^ rotr(u1, 39n);
    s[2] = u2 ^ rotr(u2, 1n) ^ rotr(u2, 6n);
    s[3] = u3 ^ rotr(u3, 10n) ^ rotr(u3, 17n);
    s[4] = u4 ^ rotr(u4, 7n) ^ rotr(u4, 41n);
    s[0] &= MASK; s[1] &= MASK; s[3] &= MASK;
  }
}

function loadBytes(arr, offset, n) {
  let x = 0n;
  for (let i = 0; i < n; i++) x |= BigInt(arr[offset + i]) << BigInt(8 * i);
  return x;
}
function storeBytes(out, offset, x, n) {
  for (let i = 0; i < n; i++) out[offset + i] = Number((x >> BigInt(8 * i)) & 0xffn);
}

const ASCON_HASH_IV = 0x0000080100cc0002n; // variant=2 | PA=12<<16 | PB=12<<20 | (256 bits)<<24 | rate(8)<<40

/** Ascon-Hash256 (NIST SP 800-232): fixed 32-byte output, rate 8 bytes, 12/12 rounds. */
export function asconHash256(data) {
  const s = new BigUint64Array(5);
  s[0] = ASCON_HASH_IV;
  asconPermutation(s, 12);

  const rate = 8;
  let off = 0;
  while (data.length - off >= rate) {
    s[0] ^= loadBytes(data, off, 8);
    asconPermutation(s, 12);
    off += rate;
  }
  const rem = data.length - off;
  s[0] ^= loadBytes(data, off, rem);
  s[0] ^= 0x01n << BigInt(8 * rem); // PAD(rem)
  asconPermutation(s, 12);

  const out = new Uint8Array(32);
  let outOff = 0;
  while (outOff < 32) {
    storeBytes(out, outOff, s[0], Math.min(8, 32 - outOff));
    outOff += 8;
    if (outOff < 32) asconPermutation(s, 12);
  }
  return out;
}

const ASCON_MAC_IV = 0x0010200080cc0005n;

/** Ascon-Mac (NIST SP 800-232): 16-byte key, default 16-byte tag, rate 32 bytes in / 16 bytes out. */
export function asconMac(key, message, tagLength = 16) {
  if (key.length !== 16) throw new Error(`Ascon-Mac requires a 16-byte key (got ${key.length})`);
  const s = new BigUint64Array(5);
  s[0] = ASCON_MAC_IV;
  s[1] = loadBytes(key, 0, 8);
  s[2] = loadBytes(key, 8, 8);
  asconPermutation(s, 12);

  let pos = 0, idx = 0;
  while (pos + 8 <= message.length) {
    s[idx] ^= loadBytes(message, pos, 8);
    idx++;
    if (idx === 4) { idx = 0; asconPermutation(s, 12); }
    pos += 8;
  }
  const rem = message.length - pos;
  if (rem > 0) s[idx] ^= loadBytes(message, pos, rem);
  s[idx] ^= 0x01n << BigInt(8 * rem);
  s[4] ^= 0x8000000000000000n;
  asconPermutation(s, 12);

  const tag = new Uint8Array(tagLength);
  let outPos = 0, wordIdx = 0;
  while (outPos < tagLength) {
    const n = Math.min(8, tagLength - outPos);
    storeBytes(tag, outPos, s[wordIdx], n);
    outPos += n;
    wordIdx++;
    if (wordIdx === 2 && outPos < tagLength) { wordIdx = 0; asconPermutation(s, 12); }
  }
  return tag;
}
