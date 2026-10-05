import { module } from './_cat.js';
import { A } from '../../core/registry.js';
import { parseHex, decodeLatin1, bytesToHex } from '../../core/util.js';
import { xtsDecrypt } from './_xts.js';

function sectorToTweak(sector) {
  let n = BigInt(sector);
  const out = new Uint8Array(16);
  for (let i = 0; i < 16; i++) { out[i] = Number(n & 0xffn); n >>= 8n; }
  return out;
}

module('AES-XTS Decrypt', 'AES-XTS decryption. Needs the same two keys and sector number used to encrypt.',
  [A.toggle('Key 1 (data)', '', ['Hex', 'UTF8', 'Latin1', 'Base64'], 'Hex'), A.toggle('Key 2 (tweak)', '', ['Hex', 'UTF8', 'Latin1', 'Base64'], 'Hex'),
    A.string('Sector number', '0'), A.select('Input', ['Hex', 'Raw']), A.select('Output', ['Raw', 'Hex'])],
  (data, k1, k2, sector, inp, out) => {
    if (inp === 'Hex') data = parseHex(decodeLatin1(data));
    const tweak = sectorToTweak(sector);
    const res = xtsDecrypt(k1, k2, tweak, data);
    return out === 'Hex' ? bytesToHex(res) : res;
  });
