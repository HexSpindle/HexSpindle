import { module } from './_cat.js';
import { A } from '../../core/registry.js';

function bytesToBigInt(u8) { let v = 0n; for (const b of u8) v = (v << 8n) | BigInt(b); return v; }
function bigIntToBytes(v, len) { const out = new Uint8Array(len); for (let i = len - 1; i >= 0; i--) { out[i] = Number(v & 0xffn); v >>= 8n; } return out; }
const pymod = (a, m) => ((a % m) + m) % m;

module('Rotate right', "Rotates bits right. Each byte on its own, or the whole input with 'Carry through'.",
  [A.number('Amount', 1, 0), A.boolean('Carry through', false)],
  (data, n, carry) => {
    n = Math.trunc(n);
    if (carry && data.length) {
      const bits = BigInt(8 * data.length);
      const bn = pymod(BigInt(n), bits);
      const v = bytesToBigInt(data);
      const mask = (1n << bits) - 1n;
      return bigIntToBytes(((v >> bn) | (v << (bits - bn))) & mask, data.length);
    }
    const n8 = pymod(n, 8);
    return Uint8Array.from(data, b => ((b >> n8) | (b << (8 - n8))) & 255);
  });
