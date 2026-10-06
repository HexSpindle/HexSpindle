import { module } from './_cat.js';
import { A } from '../../core/registry.js';
import { bytesToHex } from '../../core/util.js';
import { md2 } from './md2.js';
import { md4 } from './md4.js';
import { md5 } from './md5.js';
import { sha0 } from './sha0.js';
import { ripemd160 } from './ripemd.js';
import { has160 } from './has160.js';
import { whirlpool } from './whirlpool.js';
import { snefru } from './snefru.js';
import { sha224 } from '../encryption_encoding/_hashes.js';

// SHA-512 core with a selectable IV, for SHA-512/224 and SHA-512/256 (FIPS 180-4 5.3.6), which
// Web Crypto doesn't offer. Round constants are the first 64 bits of the fractional parts of the
// cube roots of the first 80 primes, derived here rather than tabulated.
const M64 = (1n << 64n) - 1n;
function icbrt(n) { let x = 1n << BigInt(Math.ceil(n.toString(2).length / 3)); for (;;) { const y = (2n * x + n / (x * x)) / 3n; if (y >= x) return x; x = y; } }
const PRIMES = []; for (let n = 2; PRIMES.length < 80; n++) if (PRIMES.every(p => n % p)) PRIMES.push(n);
const K512 = PRIMES.map(p => icbrt(BigInt(p) << 192n) & M64);
const rotr = (x, n) => ((x >> n) | (x << (64n - n))) & M64;
function sha512t(iv, outBytes) {
  return (data) => {
    const bitLen = BigInt(data.length) * 8n;
    const total = Math.ceil((data.length + 17) / 128) * 128;
    const buf = new Uint8Array(total); buf.set(data); buf[data.length] = 0x80;
    const dv = new DataView(buf.buffer);
    dv.setBigUint64(total - 8, bitLen);
    const h = iv.slice();
    const w = new Array(80);
    for (let off = 0; off < total; off += 128) {
      for (let i = 0; i < 16; i++) w[i] = dv.getBigUint64(off + i * 8);
      for (let i = 16; i < 80; i++) {
        const s0 = rotr(w[i - 15], 1n) ^ rotr(w[i - 15], 8n) ^ (w[i - 15] >> 7n);
        const s1 = rotr(w[i - 2], 19n) ^ rotr(w[i - 2], 61n) ^ (w[i - 2] >> 6n);
        w[i] = (w[i - 16] + s0 + w[i - 7] + s1) & M64;
      }
      let [a, b, c, d, e, f, g, hh] = h;
      for (let i = 0; i < 80; i++) {
        const t1 = (hh + (rotr(e, 14n) ^ rotr(e, 18n) ^ rotr(e, 41n)) + ((e & f) ^ (~e & M64 & g)) + K512[i] + w[i]) & M64;
        const t2 = ((rotr(a, 28n) ^ rotr(a, 34n) ^ rotr(a, 39n)) + ((a & b) ^ (a & c) ^ (b & c))) & M64;
        hh = g; g = f; f = e; e = (d + t1) & M64; d = c; c = b; b = a; a = (t1 + t2) & M64;
      }
      [a, b, c, d, e, f, g, hh].forEach((v, i) => { h[i] = (h[i] + v) & M64; });
    }
    const out = new Uint8Array(64);
    const odv = new DataView(out.buffer);
    h.forEach((v, i) => odv.setBigUint64(i * 8, v));
    return out.slice(0, outBytes);
  };
}
const IV = s => s.split(' ').map(x => BigInt('0x' + x));
const sha512_224 = sha512t(IV('8C3D37C819544DA2 73E1996689DCD4D6 1DFAB7AE32FF9C82 679DD514582F9FCF 0F6D2B697BD44DA8 77E36F7304C48942 3F9D85A86A1D36C8 1112E6AD91D692A1'), 28);
const sha512_256 = sha512t(IV('22312194FC2BF72C 9F555FA3C84C64C2 2393B86B6F53B151 963877195940EABD 96283EE2A88EFFE3 BE5E1E2553863992 2B0199FC2C85B8AA 0EB72DDC81C52CA2'), 32);

const web = (algo) => async (d) => new Uint8Array(await crypto.subtle.digest(algo, d));

const ALGO = {
  'SHA-1': [web('SHA-1'), 64], 'SHA-256': [web('SHA-256'), 64], 'SHA-384': [web('SHA-384'), 128], 'SHA-512': [web('SHA-512'), 128],
  'MD2': [md2, 16], 'MD4': [md4, 64], 'MD5': [md5, 64], 'SHA0': [sha0, 64],
  'SHA1': [web('SHA-1'), 64], 'SHA224': [sha224, 64], 'SHA256': [web('SHA-256'), 64], 'SHA384': [web('SHA-384'), 128],
  'SHA512': [web('SHA-512'), 128], 'SHA512/224': [sha512_224, 128], 'SHA512/256': [sha512_256, 128],
  'RIPEMD160': [ripemd160, 64], 'HAS160': [d => has160(d), 64], 'Whirlpool': [d => whirlpool(d), 64],
  'Snefru': [d => snefru(d, 128, 8), 48],
};

function concat(a, b) { const o = new Uint8Array(a.length + b.length); o.set(a); o.set(b, a.length); return o; }

async function hmac(name, key, data) {
  const [fn, blockSize] = ALGO[name];
  let k = key.length > blockSize ? await fn(key) : key;
  const kp = new Uint8Array(blockSize); kp.set(k);
  const ipad = kp.map(b => b ^ 0x36), opad = kp.map(b => b ^ 0x5c);
  return fn(concat(opad, await fn(concat(ipad, data))));
}

module('HMAC', 'Keyed-hash message authentication code (RFC 2104) over a choice of hash functions.',
  [A.toggle('Key', '', ['Hex', 'UTF8', 'Latin1', 'Base64', 'Decimal']), A.select('Hashing function', Object.keys(ALGO))],
  async (data, key, hashName) => bytesToHex(await hmac(hashName, key, data)));
