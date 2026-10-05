const SBOX = new Uint8Array(256);
const INV_SBOX = new Uint8Array(256);
(function initSbox() {
  const exp = new Uint8Array(512), log = new Uint8Array(256);
  let x = 1;
  for (let i = 0; i < 255; i++) {
    exp[i] = x;
    log[x] = i;
    x ^= (x << 1) ^ (x & 0x80 ? 0x1b : 0);
    x &= 0xff;
  }
  for (let i = 255; i < 512; i++) exp[i] = exp[i - 255];
  function gfInv(a) { return a === 0 ? 0 : exp[255 - log[a]]; }
  function rotl8(b, n) { return ((b << n) | (b >>> (8 - n))) & 0xff; }
  for (let i = 0; i < 256; i++) {
    const inv = gfInv(i);
    let s = inv ^ rotl8(inv, 1) ^ rotl8(inv, 2) ^ rotl8(inv, 3) ^ rotl8(inv, 4) ^ 0x63;
    SBOX[i] = s;
    INV_SBOX[s] = i;
  }
})();

const RCON = [0x01, 0x02, 0x04, 0x08, 0x10, 0x20, 0x40, 0x80, 0x1b, 0x36, 0x6c, 0xd8, 0xab, 0x4d];

function xtime(a) { return ((a << 1) ^ (a & 0x80 ? 0x1b : 0)) & 0xff; }
function gmul(a, b) {
  let p = 0;
  for (let i = 0; i < 8; i++) {
    if (b & 1) p ^= a;
    const hi = a & 0x80;
    a = (a << 1) & 0xff;
    if (hi) a ^= 0x1b;
    b >>= 1;
  }
  return p;
}

function keyExpansion(key) {
  const nk = key.length / 4; // 4, 6, 8
  const nr = nk + 6; // 10, 12, 14
  const w = new Uint8Array(4 * 4 * (nr + 1));
  w.set(key, 0);
  let bytesGenerated = key.length;
  const temp = new Uint8Array(4);
  while (bytesGenerated < w.length) {
    for (let i = 0; i < 4; i++) temp[i] = w[bytesGenerated - 4 + i];
    if (bytesGenerated % (4 * nk) === 0) {
      const t0 = temp[0];
      temp[0] = SBOX[temp[1]] ^ RCON[bytesGenerated / (4 * nk) - 1];
      temp[1] = SBOX[temp[2]];
      temp[2] = SBOX[temp[3]];
      temp[3] = SBOX[t0];
    } else if (nk > 6 && bytesGenerated % (4 * nk) === 16) {
      for (let i = 0; i < 4; i++) temp[i] = SBOX[temp[i]];
    }
    for (let i = 0; i < 4; i++) w[bytesGenerated + i] = w[bytesGenerated - 4 * nk + i] ^ temp[i];
    bytesGenerated += 4;
  }
  return { w, nr };
}

function addRoundKey(state, w, round) {
  for (let c = 0; c < 4; c++) for (let r = 0; r < 4; r++) state[r][c] ^= w[round * 16 + c * 4 + r];
}
function toState(block) {
  const s = [[], [], [], []];
  for (let c = 0; c < 4; c++) for (let r = 0; r < 4; r++) s[r][c] = block[c * 4 + r];
  return s;
}
function fromState(s) {
  const out = new Uint8Array(16);
  for (let c = 0; c < 4; c++) for (let r = 0; r < 4; r++) out[c * 4 + r] = s[r][c];
  return out;
}
function subBytes(s, box) { for (let r = 0; r < 4; r++) for (let c = 0; c < 4; c++) s[r][c] = box[s[r][c]]; }
function shiftRows(s) {
  for (let r = 1; r < 4; r++) {
    const row = [s[r][0], s[r][1], s[r][2], s[r][3]];
    for (let c = 0; c < 4; c++) s[r][c] = row[(c + r) % 4];
  }
}
function invShiftRows(s) {
  for (let r = 1; r < 4; r++) {
    const row = [s[r][0], s[r][1], s[r][2], s[r][3]];
    for (let c = 0; c < 4; c++) s[r][c] = row[(c - r + 4) % 4];
  }
}
function mixColumns(s) {
  for (let c = 0; c < 4; c++) {
    const a0 = s[0][c], a1 = s[1][c], a2 = s[2][c], a3 = s[3][c];
    s[0][c] = gmul(a0, 2) ^ gmul(a1, 3) ^ a2 ^ a3;
    s[1][c] = a0 ^ gmul(a1, 2) ^ gmul(a2, 3) ^ a3;
    s[2][c] = a0 ^ a1 ^ gmul(a2, 2) ^ gmul(a3, 3);
    s[3][c] = gmul(a0, 3) ^ a1 ^ a2 ^ gmul(a3, 2);
  }
}
function invMixColumns(s) {
  for (let c = 0; c < 4; c++) {
    const a0 = s[0][c], a1 = s[1][c], a2 = s[2][c], a3 = s[3][c];
    s[0][c] = gmul(a0, 14) ^ gmul(a1, 11) ^ gmul(a2, 13) ^ gmul(a3, 9);
    s[1][c] = gmul(a0, 9) ^ gmul(a1, 14) ^ gmul(a2, 11) ^ gmul(a3, 13);
    s[2][c] = gmul(a0, 13) ^ gmul(a1, 9) ^ gmul(a2, 14) ^ gmul(a3, 11);
    s[3][c] = gmul(a0, 11) ^ gmul(a1, 13) ^ gmul(a2, 9) ^ gmul(a3, 14);
  }
}

export function makeAes(key) {
  if (![16, 24, 32].includes(key.length)) throw new Error(`AES key must be 16, 24 or 32 bytes (got ${key.length})`);
  const { w, nr } = keyExpansion(key);
  function encryptBlock(block) {
    const s = toState(block);
    addRoundKey(s, w, 0);
    for (let round = 1; round < nr; round++) {
      subBytes(s, SBOX); shiftRows(s); mixColumns(s); addRoundKey(s, w, round);
    }
    subBytes(s, SBOX); shiftRows(s); addRoundKey(s, w, nr);
    return fromState(s);
  }
  function decryptBlock(block) {
    const s = toState(block);
    addRoundKey(s, w, nr);
    for (let round = nr - 1; round >= 1; round--) {
      invShiftRows(s); subBytes(s, INV_SBOX); addRoundKey(s, w, round); invMixColumns(s);
    }
    invShiftRows(s); subBytes(s, INV_SBOX); addRoundKey(s, w, 0);
    return fromState(s);
  }
  return { blockSize: 16, encryptBlock, decryptBlock };
}
