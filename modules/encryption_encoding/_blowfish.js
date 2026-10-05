import { P_INIT, S_INIT } from './_blowfish_constants.js';

function u32(x) { return x >>> 0; }

function f(S, x) {
  const a = (x >>> 24) & 0xff, b = (x >>> 16) & 0xff, c = (x >>> 8) & 0xff, d = x & 0xff;
  return u32((u32(S[0][a] + S[1][b]) ^ S[2][c]) + S[3][d]);
}

/** Derives the key-dependent {P, S} subkeys for a 4-56 byte key. */
export function blowfishKeySchedule(key) {
  if (key.length < 4 || key.length > 56) throw new Error(`Blowfish key must be 4-56 bytes (got ${key.length})`);
  const P = P_INIT.slice();
  const S = S_INIT.map(box => box.slice());
  for (let i = 0; i < 18; i++) {
    let k = 0;
    for (let b = 0; b < 4; b++) k = u32((k << 8) | key[(i * 4 + b) % key.length]);
    P[i] = u32(P[i] ^ k);
  }
  let L = 0, R = 0;
  for (let i = 0; i < 18; i += 2) {
    [L, R] = encryptWith(P, S, L, R);
    P[i] = L; P[i + 1] = R;
  }
  for (let box = 0; box < 4; box++) {
    for (let i = 0; i < 256; i += 2) {
      [L, R] = encryptWith(P, S, L, R);
      S[box][i] = L; S[box][i + 1] = R;
    }
  }
  return { P, S };
}

function encryptWith(P, S, L, R) {
  for (let i = 0; i < 16; i++) {
    L = u32(L ^ P[i]);
    R = u32(R ^ f(S, L));
    [L, R] = [R, L];
  }
  [L, R] = [R, L];
  R = u32(R ^ P[16]);
  L = u32(L ^ P[17]);
  return [L, R];
}
function decryptWith(P, S, L, R) {
  for (let i = 17; i > 1; i--) {
    L = u32(L ^ P[i]);
    R = u32(R ^ f(S, L));
    [L, R] = [R, L];
  }
  [L, R] = [R, L];
  R = u32(R ^ P[1]);
  L = u32(L ^ P[0]);
  return [L, R];
}

function bytesToU32BE(b, off) { return u32((b[off] << 24) | (b[off + 1] << 16) | (b[off + 2] << 8) | b[off + 3]); }
function u32ToBytesBE(v, out, off) { out[off] = (v >>> 24) & 255; out[off + 1] = (v >>> 16) & 255; out[off + 2] = (v >>> 8) & 255; out[off + 3] = v & 255; }

export function blowfishEncryptBlock(block8, keySchedule) {
  const { P, S } = keySchedule;
  const [L, R] = encryptWith(P, S, bytesToU32BE(block8, 0), bytesToU32BE(block8, 4));
  const out = new Uint8Array(8);
  u32ToBytesBE(L, out, 0); u32ToBytesBE(R, out, 4);
  return out;
}
export function blowfishDecryptBlock(block8, keySchedule) {
  const { P, S } = keySchedule;
  const [L, R] = decryptWith(P, S, bytesToU32BE(block8, 0), bytesToU32BE(block8, 4));
  const out = new Uint8Array(8);
  u32ToBytesBE(L, out, 0); u32ToBytesBE(R, out, 4);
  return out;
}
