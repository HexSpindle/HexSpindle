import { module } from './_cat.js';

function rotl(x, n) { return ((x << n) | (x >>> (32 - n))) >>> 0; }
function F(x, y, z) { return (x & y) | (~x & z); }
function G(x, y, z) { return (x & y) | (x & z) | (y & z); }
function H(x, y, z) { return x ^ y ^ z; }
function FF(a, b, c, d, x, s) { return rotl((a + F(b, c, d) + x) >>> 0, s); }
function GG(a, b, c, d, x, s) { return rotl((a + G(b, c, d) + x + 0x5A827999) >>> 0, s); }
function HH(a, b, c, d, x, s) { return rotl((a + H(b, c, d) + x + 0x6ED9EBA1) >>> 0, s); }

function md4(u8) {
  const msgLen = u8.length;
  const withOne = new Uint8Array((msgLen + 9 + 63) & ~63);
  withOne.set(u8);
  withOne[msgLen] = 0x80;
  const bitLen = BigInt(msgLen) * 8n;
  const dv = new DataView(withOne.buffer);
  dv.setUint32(withOne.length - 8, Number(bitLen & 0xffffffffn), true);
  dv.setUint32(withOne.length - 4, Number((bitLen >> 32n) & 0xffffffffn), true);

  let a0 = 0x67452301, b0 = 0xefcdab89, c0 = 0x98badcfe, d0 = 0x10325476;
  for (let chunk = 0; chunk < withOne.length; chunk += 64) {
    const X = [];
    for (let j = 0; j < 16; j++) X.push(dv.getUint32(chunk + j * 4, true));
    let A = a0, B = b0, C = c0, D = d0;
    A = FF(A,B,C,D,X[0],3); D = FF(D,A,B,C,X[1],7); C = FF(C,D,A,B,X[2],11); B = FF(B,C,D,A,X[3],19);
    A = FF(A,B,C,D,X[4],3); D = FF(D,A,B,C,X[5],7); C = FF(C,D,A,B,X[6],11); B = FF(B,C,D,A,X[7],19);
    A = FF(A,B,C,D,X[8],3); D = FF(D,A,B,C,X[9],7); C = FF(C,D,A,B,X[10],11); B = FF(B,C,D,A,X[11],19);
    A = FF(A,B,C,D,X[12],3); D = FF(D,A,B,C,X[13],7); C = FF(C,D,A,B,X[14],11); B = FF(B,C,D,A,X[15],19);
    A = GG(A,B,C,D,X[0],3); D = GG(D,A,B,C,X[4],5); C = GG(C,D,A,B,X[8],9); B = GG(B,C,D,A,X[12],13);
    A = GG(A,B,C,D,X[1],3); D = GG(D,A,B,C,X[5],5); C = GG(C,D,A,B,X[9],9); B = GG(B,C,D,A,X[13],13);
    A = GG(A,B,C,D,X[2],3); D = GG(D,A,B,C,X[6],5); C = GG(C,D,A,B,X[10],9); B = GG(B,C,D,A,X[14],13);
    A = GG(A,B,C,D,X[3],3); D = GG(D,A,B,C,X[7],5); C = GG(C,D,A,B,X[11],9); B = GG(B,C,D,A,X[15],13);
    A = HH(A,B,C,D,X[0],3); D = HH(D,A,B,C,X[8],9); C = HH(C,D,A,B,X[4],11); B = HH(B,C,D,A,X[12],15);
    A = HH(A,B,C,D,X[2],3); D = HH(D,A,B,C,X[10],9); C = HH(C,D,A,B,X[6],11); B = HH(B,C,D,A,X[14],15);
    A = HH(A,B,C,D,X[1],3); D = HH(D,A,B,C,X[9],9); C = HH(C,D,A,B,X[5],11); B = HH(B,C,D,A,X[13],15);
    A = HH(A,B,C,D,X[3],3); D = HH(D,A,B,C,X[11],9); C = HH(C,D,A,B,X[7],11); B = HH(B,C,D,A,X[15],15);
    a0 = (a0 + A) >>> 0; b0 = (b0 + B) >>> 0; c0 = (c0 + C) >>> 0; d0 = (d0 + D) >>> 0;
  }
  const out = new Uint8Array(16);
  const outDv = new DataView(out.buffer);
  [a0, b0, c0, d0].forEach((v, i) => outDv.setUint32(i * 4, v, true));
  return out;
}

module('MD4', 'MD4 message digest (obsolete).', [],
  (data) => [...md4(data)].map(b => b.toString(16).padStart(2, '0')).join(''));
export { md4 };
