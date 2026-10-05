import { bigIntToBytes, bytesToBigInt, modExp } from './_bignum.js';
import { derSequence, derOid, derNull, derOctetString } from './_asn1.js';
import { concatBytes } from '../../core/util.js';
import { md5 } from '../hashing/md5.js';

const DIGEST_OID = {
  MD5: '1.2.840.113549.2.5', 'SHA-1': '1.3.14.3.2.26', 'SHA-256': '2.16.840.1.101.3.4.2.1',
  'SHA-384': '2.16.840.1.101.3.4.2.2', 'SHA-512': '2.16.840.1.101.3.4.2.3',
};
const DIGEST_LEN = { MD5: 16, 'SHA-1': 20, 'SHA-256': 32, 'SHA-384': 48, 'SHA-512': 64 };

export function digestLen(name) { return DIGEST_LEN[name]; }

export async function digest(name, data) {
  if (name === 'MD5') return md5(data);
  return new Uint8Array(await crypto.subtle.digest(name, data));
}

function modulusByteLen(n) { return Math.ceil(n.toString(2).length / 8); }

function eq(a, b) {
  if (a.length !== b.length) return false;
  let d = 0;
  for (let i = 0; i < a.length; i++) d |= a[i] ^ b[i];
  return d === 0;
}


function digestInfo(hashName, digestBytes) {
  return derSequence([derSequence([derOid(DIGEST_OID[hashName]), derNull()]), derOctetString(digestBytes)]);
}

export async function pkcs1v15Sign(n, d, hashName, message) {
  const h = await digest(hashName, message);
  const t = digestInfo(hashName, h);
  const k = modulusByteLen(n);
  if (t.length > k - 11) throw new Error('Digest too large for this RSA key size');
  const ps = new Uint8Array(k - t.length - 3).fill(0xff);
  const em = concatBytes([new Uint8Array([0, 1]), ps, new Uint8Array([0]), t]);
  return bigIntToBytes(modExp(bytesToBigInt(em), d, n), k);
}

export async function pkcs1v15Verify(n, e, hashName, message, signature) {
  const k = modulusByteLen(n);
  if (signature.length !== k) return false;
  const h = await digest(hashName, message);
  const t = digestInfo(hashName, h);
  const ps = new Uint8Array(k - t.length - 3).fill(0xff);
  const expected = concatBytes([new Uint8Array([0, 1]), ps, new Uint8Array([0]), t]);
  const em = bigIntToBytes(modExp(bytesToBigInt(signature), e, n), k);
  return eq(em, expected);
}


async function mgf1(seed, maskLen, hashName) {
  const hLen = digestLen(hashName);
  const out = new Uint8Array(Math.ceil(maskLen / hLen) * hLen);
  for (let counter = 0; counter * hLen < out.length; counter++) {
    const c = new Uint8Array(4);
    new DataView(c.buffer).setUint32(0, counter);
    const chunk = await digest(hashName, concatBytes([seed, c]));
    out.set(chunk, counter * hLen);
  }
  return out.subarray(0, maskLen);
}

function xorBytes(a, b) { const out = new Uint8Array(a.length); for (let i = 0; i < a.length; i++) out[i] = a[i] ^ b[i]; return out; }

export async function pssSign(n, d, hashName, message, saltLen) {
  const k = modulusByteLen(n);
  const emBits = n.toString(2).length - 1;
  const emLen = Math.ceil(emBits / 8);
  const hLen = digestLen(hashName);
  const mHash = await digest(hashName, message);
  if (saltLen === undefined || saltLen === null) saltLen = emLen - hLen - 2; // "maximum length" (cryptography's PSS.MAX_LENGTH)
  if (saltLen < 0) throw new Error('RSA key too small for PSS with this digest');
  const salt = new Uint8Array(saltLen);
  crypto.getRandomValues(salt);
  const m1 = concatBytes([new Uint8Array(8), mHash, salt]);
  const h = await digest(hashName, m1);
  const psLen = emLen - saltLen - hLen - 2;
  const db = concatBytes([new Uint8Array(psLen), new Uint8Array([1]), salt]);
  const dbMask = await mgf1(h, db.length, hashName);
  const maskedDb = xorBytes(db, dbMask);
  const topBits = 8 * emLen - emBits;
  if (topBits > 0) maskedDb[0] &= 0xff >> topBits;
  const em = concatBytes([maskedDb, h, new Uint8Array([0xbc])]);
  return bigIntToBytes(modExp(bytesToBigInt(em), d, n), k);
}

export async function pssVerify(n, e, hashName, message, signature) {
  const k = modulusByteLen(n);
  if (signature.length !== k) return false;
  const emBits = n.toString(2).length - 1;
  const emLen = Math.ceil(emBits / 8);
  const hLen = digestLen(hashName);
  if (emLen < hLen + 2) return false;
  const em = bigIntToBytes(modExp(bytesToBigInt(signature), e, n), emLen);
  if (em[em.length - 1] !== 0xbc) return false;
  const topBits = 8 * emLen - emBits;
  const maskedDb = em.subarray(0, emLen - hLen - 1);
  const h = em.subarray(emLen - hLen - 1, emLen - 1);
  if (topBits > 0 && (maskedDb[0] & (0xff << (8 - topBits)) & 0xff)) return false;
  const dbMask = await mgf1(h, maskedDb.length, hashName);
  const db = xorBytes(maskedDb, dbMask);
  if (topBits > 0) db[0] &= 0xff >> topBits;
  let i = 0;
  while (i < db.length && db[i] === 0) i++;
  if (i === db.length || db[i] !== 1) return false;
  const salt = db.subarray(i + 1);
  const mHash = await digest(hashName, message);
  const m1 = concatBytes([new Uint8Array(8), mHash, salt]);
  const hPrime = await digest(hashName, m1);
  return eq(h, hPrime);
}
