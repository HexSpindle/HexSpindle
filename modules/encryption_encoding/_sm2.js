import { sm3 } from '../hashing/sm3.js';
import { concatBytes } from '../../core/util.js';

const P = BigInt('0xFFFFFFFEFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFF00000000FFFFFFFFFFFFFFFF');
const A = BigInt('0xFFFFFFFEFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFF00000000FFFFFFFFFFFFFFFC');
const B = BigInt('0x28E9FA9E9D9F5E344D5A9E4BCF6509A7F39789F515AB8F92DDBCBD414D940E93');
const N = BigInt('0xFFFFFFFEFFFFFFFFFFFFFFFFFFFFFFFF7203DF6B21C6052B53BBF40939D54123');
const GX = BigInt('0x32C4AE2C1F1981195F9904466A39C9948FE30BBFF2660BE1715A4589334C74C7');
const GY = BigInt('0xBC3736A2F4F6779C59BDCEE36B692153D0A9877CC62A474002DF32E52139F0A0');
const G = { x: GX, y: GY };

function mod(a, m) { const r = a % m; return r >= 0n ? r : r + m; }

function modInverse(a, m) {
  a = mod(a, m);
  let [old_r, r] = [a, m];
  let [old_s, s] = [1n, 0n];
  while (r !== 0n) {
    const q = old_r / r;
    [old_r, r] = [r, old_r - q * r];
    [old_s, s] = [s, old_s - q * s];
  }
  if (old_r !== 1n) throw new Error('No modular inverse exists');
  return mod(old_s, m);
}

function isInfinity(p) { return p === null; }

function pointDouble(pt) {
  if (isInfinity(pt) || pt.y === 0n) return null;
  const lambda = mod((3n * pt.x * pt.x + A) * modInverse(2n * pt.y, P), P);
  const x3 = mod(lambda * lambda - 2n * pt.x, P);
  const y3 = mod(lambda * (pt.x - x3) - pt.y, P);
  return { x: x3, y: y3 };
}

function pointAdd(p1, p2) {
  if (isInfinity(p1)) return p2;
  if (isInfinity(p2)) return p1;
  if (p1.x === p2.x) {
    if (mod(p1.y + p2.y, P) === 0n) return null; // P + (-P) = infinity
    return pointDouble(p1);
  }
  const lambda = mod((p2.y - p1.y) * modInverse(p2.x - p1.x, P), P);
  const x3 = mod(lambda * lambda - p1.x - p2.x, P);
  const y3 = mod(lambda * (p1.x - x3) - p1.y, P);
  return { x: x3, y: y3 };
}

function scalarMul(k, pt) {
  let result = null;
  let addend = pt;
  k = mod(k, N);
  while (k > 0n) {
    if (k & 1n) result = pointAdd(result, addend);
    addend = pointDouble(addend);
    k >>= 1n;
  }
  return result;
}

function isOnCurve(pt) {
  if (isInfinity(pt)) return false;
  const lhs = mod(pt.y * pt.y, P);
  const rhs = mod(pt.x * pt.x * pt.x + A * pt.x + B, P);
  return lhs === rhs;
}

function bigIntToBytes(v, len) {
  const out = new Uint8Array(len);
  for (let i = len - 1; i >= 0; i--) { out[i] = Number(v & 0xffn); v >>= 8n; }
  return out;
}
function bytesToBigInt(bytes) {
  let v = 0n;
  for (const b of bytes) v = (v << 8n) | BigInt(b);
  return v;
}

function kdf(z, klen) {
  const blocks = Math.ceil(klen / 32);
  const out = new Uint8Array(blocks * 32);
  for (let ct = 1; ct <= blocks; ct++) {
    const ctBytes = new Uint8Array(4);
    ctBytes[0] = (ct >>> 24) & 0xff; ctBytes[1] = (ct >>> 16) & 0xff; ctBytes[2] = (ct >>> 8) & 0xff; ctBytes[3] = ct & 0xff;
    out.set(sm3(concatBytes([z, ctBytes])), (ct - 1) * 32);
  }
  return out.subarray(0, klen);
}

function pointToXYBytes(pt) { return [bigIntToBytes(pt.x, 32), bigIntToBytes(pt.y, 32)]; }

function randomScalar() {
  while (true) {
    const bytes = new Uint8Array(32);
    crypto.getRandomValues(bytes);
    const k = mod(bytesToBigInt(bytes), N - 1n) + 1n;
    if (k > 0n && k < N) return k;
  }
}

export function sm2PublicKeyFromXY(xHex, yHex) {
  if (xHex.length !== 64 || yHex.length !== 64) throw new Error('Public key X and Y must each be 32 bytes (64 hex characters)');
  const pt = { x: BigInt('0x' + xHex), y: BigInt('0x' + yHex) };
  if (!isOnCurve(pt)) throw new Error('Public key point is not on the sm2p256v1 curve');
  return pt;
}

export function sm2Encrypt(pub, plaintext, format = 'C1C3C2', kOverride = null) {
  if (!plaintext.length) throw new Error('Plaintext must not be empty');
  const k = kOverride !== null ? kOverride : randomScalar();
  const c1Point = scalarMul(k, G);
  const [c1x, c1y] = pointToXYBytes(c1Point);
  const p2 = scalarMul(k, pub);
  const [x2, y2] = pointToXYBytes(p2);
  const t = kdf(concatBytes([x2, y2]), plaintext.length);
  let allZero = true;
  for (const b of t) if (b !== 0) { allZero = false; break; }
  if (allZero) throw new Error('KDF produced an all-zero keystream; choose a different k');
  const c2 = new Uint8Array(plaintext.length);
  for (let i = 0; i < plaintext.length; i++) c2[i] = plaintext[i] ^ t[i];
  const c3 = sm3(concatBytes([x2, plaintext, y2]));
  return format === 'C1C2C3' ? concatBytes([c1x, c1y, c2, c3]) : concatBytes([c1x, c1y, c3, c2]);
}

export function sm2Decrypt(priv, cipher, format = 'C1C3C2') {
  if (cipher.length < 64 + 32) throw new Error('Ciphertext too short');
  const c1x = cipher.subarray(0, 32), c1y = cipher.subarray(32, 64);
  const c1 = { x: bytesToBigInt(c1x), y: bytesToBigInt(c1y) };
  if (!isOnCurve(c1)) throw new Error('C1 is not a valid point on the curve');
  let c2, c3;
  if (format === 'C1C2C3') {
    c3 = cipher.subarray(cipher.length - 32);
    c2 = cipher.subarray(64, cipher.length - 32);
  } else {
    c3 = cipher.subarray(64, 96);
    c2 = cipher.subarray(96);
  }
  const p2 = scalarMul(priv, c1);
  const [x2, y2] = pointToXYBytes(p2);
  const t = kdf(concatBytes([x2, y2]), c2.length);
  const plaintext = new Uint8Array(c2.length);
  for (let i = 0; i < c2.length; i++) plaintext[i] = c2[i] ^ t[i];
  const expectC3 = sm3(concatBytes([x2, plaintext, y2]));
  let diff = 0;
  for (let i = 0; i < 32; i++) diff |= expectC3[i] ^ c3[i];
  if (diff !== 0) throw new Error('Decryption error: C3 hash does not match (wrong key, or tampered ciphertext)');
  return plaintext;
}

export { G, scalarMul, isOnCurve, N };
