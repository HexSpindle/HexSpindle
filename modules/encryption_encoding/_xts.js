import { makeAes } from './_aes.js';

function gfMulX(t) {
  const out = new Uint8Array(16);
  let carry = 0;
  for (let i = 0; i < 16; i++) {
    out[i] = ((t[i] << 1) | carry) & 0xff;
    carry = (t[i] >> 7) & 1;
  }
  if (carry) out[0] ^= 0x87;
  return out;
}

function xorb(a, b) {
  const out = new Uint8Array(a.length);
  for (let i = 0; i < a.length; i++) out[i] = a[i] ^ b[i];
  return out;
}

function computeTweaks(aes2, tweak0, full) {
  let t = aes2.encryptBlock(tweak0);
  const tweaks = [];
  for (let i = 0; i < full; i++) { tweaks.push(t); t = gfMulX(t); }
  return tweaks;
}

export function xtsEncrypt(key1, key2, tweak0, data) {
  const aes1 = makeAes(key1), aes2 = makeAes(key2);
  const n = data.length;
  const full = Math.floor(n / 16), rem = n % 16;
  const tweaks = computeTweaks(aes2, tweak0, full);
  const out = new Uint8Array(n);
  if (rem === 0) {
    for (let i = 0; i < full; i++) {
      const block = data.subarray(i * 16, (i + 1) * 16);
      out.set(xorb(aes1.encryptBlock(xorb(block, tweaks[i])), tweaks[i]), i * 16);
    }
    return out;
  }
  for (let i = 0; i < full - 1; i++) {
    const block = data.subarray(i * 16, (i + 1) * 16);
    out.set(xorb(aes1.encryptBlock(xorb(block, tweaks[i])), tweaks[i]), i * 16);
  }
  const pm1 = data.subarray((full - 1) * 16, full * 16);
  const cc = xorb(aes1.encryptBlock(xorb(pm1, tweaks[full - 1])), tweaks[full - 1]);
  const ptail = data.subarray(full * 16, full * 16 + rem);
  const ppp = new Uint8Array(16);
  ppp.set(ptail, 0); ppp.set(cc.subarray(rem, 16), rem);
  const tLast = gfMulX(tweaks[full - 1]);
  const ccc = xorb(aes1.encryptBlock(xorb(ppp, tLast)), tLast);
  out.set(ccc, (full - 1) * 16);
  out.set(cc.subarray(0, rem), full * 16);
  return out;
}

export function xtsDecrypt(key1, key2, tweak0, data) {
  const aes1 = makeAes(key1), aes2 = makeAes(key2);
  const n = data.length;
  const full = Math.floor(n / 16), rem = n % 16;
  const tweaks = computeTweaks(aes2, tweak0, full);
  const out = new Uint8Array(n);
  if (rem === 0) {
    for (let i = 0; i < full; i++) {
      const block = data.subarray(i * 16, (i + 1) * 16);
      out.set(xorb(aes1.decryptBlock(xorb(block, tweaks[i])), tweaks[i]), i * 16);
    }
    return out;
  }
  for (let i = 0; i < full - 1; i++) {
    const block = data.subarray(i * 16, (i + 1) * 16);
    out.set(xorb(aes1.decryptBlock(xorb(block, tweaks[i])), tweaks[i]), i * 16);
  }
  const ccc = data.subarray((full - 1) * 16, full * 16);
  const cp = data.subarray(full * 16, full * 16 + rem);
  const tLast = gfMulX(tweaks[full - 1]);
  const ppp = xorb(aes1.decryptBlock(xorb(ccc, tLast)), tLast);
  const ptail = ppp.subarray(0, rem);
  const ccTail = ppp.subarray(rem, 16);
  const cc = new Uint8Array(16);
  cc.set(cp, 0); cc.set(ccTail, rem);
  const pm1 = xorb(aes1.decryptBlock(xorb(cc, tweaks[full - 1])), tweaks[full - 1]);
  out.set(pm1, (full - 1) * 16);
  out.set(ptail, full * 16);
  return out;
}
