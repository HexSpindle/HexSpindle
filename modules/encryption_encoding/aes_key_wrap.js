import { module } from './_cat.js';
import { A } from '../../core/registry.js';
import { parseHex, decodeLatin1, bytesToHex } from '../../core/util.js';
import { makeAes } from './_aes.js';

module('AES Key Wrap', 'Wraps a key with AES Key Wrap (RFC 3394). Output is hex.',
  [A.toggle('Key encryption key', '', ['Hex', 'UTF8', 'Latin1', 'Base64'], 'Hex'), A.toggle('IV', 'A6A6A6A6A6A6A6A6', ['Hex', 'UTF8', 'Latin1', 'Base64'], 'Hex'), A.select('Input', ['Raw', 'Hex'])],
  (data, kek, iv, inp) => {
    const p = inp === 'Hex' ? parseHex(decodeLatin1(data)) : data;
    if (p.length % 8 || p.length < 16) throw new Error('Key data must be a multiple of 8 bytes and at least 16 bytes');
    const aes = makeAes(kek);
    let a = iv && iv.length ? iv : new Uint8Array([0xa6, 0xa6, 0xa6, 0xa6, 0xa6, 0xa6, 0xa6, 0xa6]);
    const n = p.length / 8;
    const r = [];
    for (let i = 0; i < n; i++) r.push(p.slice(i * 8, i * 8 + 8));
    for (let j = 0; j < 6; j++) {
      for (let i = 0; i < n; i++) {
        const block = new Uint8Array(16);
        block.set(a, 0); block.set(r[i], 8);
        const b = aes.encryptBlock(block);
        let av = 0n;
        for (let k = 0; k < 8; k++) av = (av << 8n) | BigInt(b[k]);
        av ^= BigInt(n * j + i + 1);
        a = new Uint8Array(8);
        for (let k = 7; k >= 0; k--) { a[k] = Number(av & 0xffn); av >>= 8n; }
        r[i] = b.slice(8);
      }
    }
    const out = new Uint8Array(8 + p.length);
    out.set(a, 0);
    for (let i = 0; i < n; i++) out.set(r[i], 8 + i * 8);
    return bytesToHex(out);
  });
