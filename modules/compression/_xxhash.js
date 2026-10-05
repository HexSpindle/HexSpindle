const PRIME1 = 0x9E3779B1, PRIME2 = 0x85EBCA77, PRIME3 = 0xC2B2AE3D, PRIME4 = 0x27D4EB2F, PRIME5 = 0x165667B1;

function rotl(x, r) { return ((x << r) | (x >>> (32 - r))) >>> 0; }
function mul32(a, b) { return Math.imul(a, b) >>> 0; }

export function xxh32(data, seed = 0) {
  let i = 0;
  const n = data.length;
  let h32;
  if (n >= 16) {
    let v1 = (seed + PRIME1 + PRIME2) >>> 0, v2 = (seed + PRIME2) >>> 0, v3 = seed >>> 0, v4 = (seed - PRIME1) >>> 0;
    const limit = n - 16;
    while (i <= limit) {
      v1 = round(v1, readU32(data, i)); i += 4;
      v2 = round(v2, readU32(data, i)); i += 4;
      v3 = round(v3, readU32(data, i)); i += 4;
      v4 = round(v4, readU32(data, i)); i += 4;
    }
    h32 = (rotl(v1, 1) + rotl(v2, 7) + rotl(v3, 12) + rotl(v4, 18)) >>> 0;
  } else {
    h32 = (seed + PRIME5) >>> 0;
  }
  h32 = (h32 + n) >>> 0;
  while (i + 4 <= n) {
    h32 = (h32 + mul32(readU32(data, i), PRIME3)) >>> 0;
    h32 = mul32(rotl(h32, 17), PRIME4);
    i += 4;
  }
  while (i < n) {
    h32 = (h32 + mul32(data[i], PRIME5)) >>> 0;
    h32 = mul32(rotl(h32, 11), PRIME1);
    i++;
  }
  h32 ^= h32 >>> 15;
  h32 = mul32(h32, PRIME2);
  h32 ^= h32 >>> 13;
  h32 = mul32(h32, PRIME3);
  h32 ^= h32 >>> 16;
  return h32 >>> 0;
}

function round(acc, input) { acc = (acc + mul32(input, PRIME2)) >>> 0; acc = rotl(acc, 13); return mul32(acc, PRIME1); }
function readU32(data, i) { return (data[i] | (data[i + 1] << 8) | (data[i + 2] << 16) | (data[i + 3] << 24)) >>> 0; }
