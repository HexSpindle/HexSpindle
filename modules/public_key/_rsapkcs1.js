import { bigIntToBytes, bytesToBigInt, modExp } from './_bignum.js';

function modulusByteLen(n) { return Math.ceil(n.toString(2).length / 8); }

export function rsaesPkcs1Encrypt(n, e, message) {
  const k = modulusByteLen(n);
  if (message.length > k - 11) throw new Error(`Message too long for this RSA key with PKCS#1 v1.5 padding (max ${k - 11} bytes)`);
  const psLen = k - message.length - 3;
  const ps = new Uint8Array(psLen);
  crypto.getRandomValues(ps);
  for (let i = 0; i < ps.length; i++) if (ps[i] === 0) ps[i] = 1;
  const eb = new Uint8Array(k);
  eb[0] = 0; eb[1] = 2; eb.set(ps, 2); eb[2 + psLen] = 0; eb.set(message, 3 + psLen);
  return bigIntToBytes(modExp(bytesToBigInt(eb), e, n), k);
}

export function rsaesPkcs1Decrypt(n, d, ciphertext) {
  const k = modulusByteLen(n);
  const eb = bigIntToBytes(modExp(bytesToBigInt(ciphertext), d, n), k);
  if (eb[0] !== 0 || eb[1] !== 2) throw new Error('Decryption error');
  let i = 2;
  while (i < eb.length && eb[i] !== 0) i++;
  if (i === eb.length) throw new Error('Decryption error');
  return eb.subarray(i + 1);
}
