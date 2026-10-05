export function bytesToBigInt(bytes) {
  let v = 0n;
  for (const b of bytes) v = (v << 8n) | BigInt(b);
  return v;
}

export function bigIntToBytes(n, minLen = 1) {
  if (n < 0n) throw new Error('bigIntToBytes: negative value');
  let hex = n.toString(16);
  if (hex.length % 2) hex = '0' + hex;
  let len = hex.length / 2;
  if (len < minLen) hex = '00'.repeat(minLen - len) + hex;
  const out = new Uint8Array(hex.length / 2);
  for (let i = 0; i < out.length; i++) out[i] = parseInt(hex.substr(i * 2, 2), 16);
  return out;
}

export function modExp(base, exp, mod) {
  if (mod === 1n) return 0n;
  base = ((base % mod) + mod) % mod;
  let result = 1n;
  while (exp > 0n) {
    if (exp & 1n) result = (result * base) % mod;
    exp >>= 1n;
    base = (base * base) % mod;
  }
  return result;
}

/** Extended Euclidean algorithm: returns [g, x, y] such that a*x + b*y = g = gcd(a,b). */
function egcd(a, b) {
  if (b === 0n) return [a, 1n, 0n];
  const [g, x1, y1] = egcd(b, a % b);
  return [g, y1, x1 - (a / b) * y1];
}

export function modInverse(a, m) {
  a = ((a % m) + m) % m;
  const [g, x] = egcd(a, m);
  if (g !== 1n) throw new Error('modInverse: no inverse exists (not coprime)');
  return ((x % m) + m) % m;
}

function randomBits(bits) {
  const byteLen = Math.ceil(bits / 8);
  const bytes = new Uint8Array(byteLen);
  crypto.getRandomValues(bytes);
  const extraBits = byteLen * 8 - bits;
  if (extraBits) bytes[0] &= 0xff >> extraBits;
  return bytes;
}

/** A cryptographically-random BigInt with exactly `bits` bits (top bit forced to 1). */
export function randomBigInt(bits) {
  const bytes = randomBits(bits);
  bytes[0] |= 0x80 >> ((8 - (bits % 8 || 8)) % 8);
  return bytesToBigInt(bytes);
}

/** A uniformly-random BigInt in [0, max). */
export function randomBelow(max) {
  const bits = max.toString(2).length;
  let v;
  do { v = bytesToBigInt(randomBits(bits)) & ((1n << BigInt(bits)) - 1n); } while (v >= max);
  return v;
}

const SMALL_PRIMES = [2, 3, 5, 7, 11, 13, 17, 19, 23, 29, 31, 37, 41, 43, 47, 53, 59, 61, 67, 71, 73, 79, 83, 89, 97].map(BigInt);

export function isProbablePrime(n, rounds = 20) {
  if (n < 2n) return false;
  for (const p of SMALL_PRIMES) {
    if (n === p) return true;
    if (n % p === 0n) return false;
  }
  let d = n - 1n, r = 0n;
  while (d % 2n === 0n) { d /= 2n; r++; }
  witnessLoop: for (let i = 0; i < rounds; i++) {
    const a = 2n + randomBelow(n - 3n);
    let x = modExp(a, d, n);
    if (x === 1n || x === n - 1n) continue;
    for (let j = 0n; j < r - 1n; j++) {
      x = (x * x) % n;
      if (x === n - 1n) continue witnessLoop;
    }
    return false;
  }
  return true;
}

/** A random probable prime with the top two bits set (standard modulus-building convention) and
 * (for DH/ElGamal use) optionally forced odd; used for key/parameter generation. */
export function randomPrime(bits) {
  while (true) {
    let n = randomBigInt(bits);
    n |= (1n << BigInt(bits - 1)) | 1n; // ensure top bit + odd
    if (isProbablePrime(n)) return n;
  }
}
