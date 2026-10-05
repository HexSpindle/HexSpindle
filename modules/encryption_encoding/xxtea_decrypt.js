import { module } from './_cat.js';
import { A } from '../../core/registry.js';
import { parseHex, decodeLatin1 } from '../../core/util.js';
import { btea, bytesToWordsLE, wordsToBytesLE } from './xxtea_encrypt.js';

function rstripZeros(bytes) {
  let end = bytes.length;
  while (end > 0 && bytes[end - 1] === 0) end--;
  return bytes.slice(0, end);
}

module('XXTEA Decrypt', 'Decrypts XXTEA hex data (16-byte key). Trailing zero padding is removed.',
  [A.toggle('Key', '', ['UTF8', 'Hex', 'Latin1', 'Base64'], 'UTF8')],
  (data, key) => {
    if (key.length !== 16) throw new Error('Key must be 16 bytes');
    const b = parseHex(decodeLatin1(data));
    const v = bytesToWordsLE(b);
    const keyWords = bytesToWordsLE(key);
    return rstripZeros(wordsToBytesLE(btea(v, keyWords, false)));
  });
