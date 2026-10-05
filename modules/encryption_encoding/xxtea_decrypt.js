import { module } from './_cat.js';
import { A } from '../../core/registry.js';
import { parseHex, decodeLatin1 } from '../../core/util.js';
import { btea, bytesToWordsLE, wordsToBytesLE, xxteaJsDecrypt, XXTEA_FORMATS } from './xxtea_encrypt.js';

function rstripZeros(bytes) {
  let end = bytes.length;
  while (end > 0 && bytes[end - 1] === 0) end--;
  return bytes.slice(0, end);
}

module('XXTEA Decrypt', 'Decrypts XXTEA data (16-byte key). Default format is xxtea.js',
  [A.toggle('Key', '', ['Hex', 'UTF8', 'Latin1', 'Base64'], 'Hex'), A.select('Format', XXTEA_FORMATS, XXTEA_FORMATS[0])],
  (data, key, format) => {
    if (format !== XXTEA_FORMATS[1]) return xxteaJsDecrypt(data, key);
    if (key.length !== 16) throw new Error('Key must be 16 bytes');
    const b = parseHex(decodeLatin1(data));
    const v = bytesToWordsLE(b);
    const keyWords = bytesToWordsLE(key);
    return rstripZeros(wordsToBytesLE(btea(v, keyWords, false)));
  });
