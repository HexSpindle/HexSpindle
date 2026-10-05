import { module } from './_cat.js';
import { A } from '../../core/registry.js';
import { parseHex, decodeLatin1, bytesToHex, bytesEqual } from '../../core/util.js';
import { makeAes } from './_aes.js';

module('AES Key Unwrap', 'Unwraps an AES Key Wrap (RFC 3394) hex string and checks its integrity.',
  [A.toggle('Key encryption key', '', ['Hex', 'UTF8', 'Latin1', 'Base64'], 'Hex'), A.toggle('IV', 'A6A6A6A6A6A6A6A6', ['Hex', 'UTF8', 'Latin1', 'Base64'], 'Hex'), A.select('Output', ['Hex', 'Raw'])],
  (data, kek, iv, out) => {
    const c = parseHex(decodeLatin1(data));
    const aes = makeAes(kek);
    let a = c.slice(0, 8);
    const n = (c.length - 8) / 8;
    const r = [];
    for (let i = 0; i < n; i++) r.push(c.slice(8 + i * 8, 16 + i * 8));
    for (let j = 5; j >= 0; j--) {
      for (let i = n - 1; i >= 0; i--) {
        let av = 0n;
        for (let k = 0; k < 8; k++) av = (av << 8n) | BigInt(a[k]);
        av ^= BigInt(n * j + i + 1);
        const t = new Uint8Array(8);
        for (let k = 7; k >= 0; k--) { t[k] = Number(av & 0xffn); av >>= 8n; }
        const block = new Uint8Array(16);
        block.set(t, 0); block.set(r[i], 8);
        const b = aes.decryptBlock(block);
        a = b.slice(0, 8);
        r[i] = b.slice(8);
      }
    }
    const expectedIv = iv && iv.length ? iv : new Uint8Array([0xa6, 0xa6, 0xa6, 0xa6, 0xa6, 0xa6, 0xa6, 0xa6]);
    if (!bytesEqual(a, expectedIv)) throw new Error('Integrity check failed: wrong key or corrupt data');
    const raw = new Uint8Array(n * 8);
    for (let i = 0; i < n; i++) raw.set(r[i], i * 8);
    return out === 'Hex' ? bytesToHex(raw) : raw;
  });
