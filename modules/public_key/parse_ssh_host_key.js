import { module } from './_cat.js';
import { A } from '../../core/registry.js';
import { base64Encode, base64Decode, bytesToHex, parseHex, decodeLatin1 } from '../../core/util.js';
import { md5 } from '../hashing/md5.js';

/** ParseSSHHostKey.detectKeyFormat. */
function detectKeyFormat(key) {
  if (/^(?:[\dA-Fa-f]{2}[ ,;:]?)+$/.test(key)) return 'Hex';
  if (/^\s*(?:[A-Za-z\d+/]{4})+(?:[A-Za-z\d+/]{2}==|[A-Za-z\d+/]{3}=)?\s*$/.test(key)) return 'Base64';
  throw new Error('Unable to detect input key format.');
}

/** ParseSSHHostKey.convertKeyToBinary. */
function convertKeyToBinary(inputKey, inputFormat) {
  const keyMatch = inputKey.match(/^(?:ssh|ecdsa-sha2)\S+\s+(\S*)/);
  if (keyMatch) inputKey = keyMatch[1];
  if (inputFormat === 'Auto') inputFormat = detectKeyFormat(inputKey);
  if (inputFormat === 'Hex') return parseHex(inputKey.replace(/[ ,;:]/g, ''));
  if (inputFormat === 'Base64') return base64Decode(inputKey);
  throw new Error('Invalid input format.');
}

/** ParseSSHHostKey.parseKey: length-prefixed fields, as hex strings. */
function parseKey(key) {
  const fields = [];
  while (key.length > 0) {
    const lengthField = key.slice(0, 4);
    let decodedLength = 0;
    for (let i = 0; i < lengthField.length; i++) {
      decodedLength += lengthField[i];
      decodedLength = decodedLength << 8;
    }
    decodedLength = decodedLength >> 8;
    if (decodedLength <= 0) break;
    fields.push(bytesToHex(key.slice(4, 4 + decodedLength)));
    key = key.slice(4 + decodedLength);
  }
  return fields;
}

module('Parse SSH Host Key', 'Parses an SSH host key and extracts fields from it. The key type can be ssh-rsa, ssh-dss, ecdsa-sha2 or ssh-ed25519, and the key format either Hex or Base64. "Show fingerprints" additionally prints the MD5 and SHA256 fingerprints of the key blob, as ssh-keygen -l does.',
  [A.select('Input Format', ['Auto', 'Base64', 'Hex']), A.boolean('Show fingerprints', false)],
  async (t, inputFormat, showFingerprints) => {
    const inputKey = convertKeyToBinary(t.trim(), inputFormat);
    const fields = parseKey(inputKey);
    const keyType = decodeLatin1(parseHex(fields[0]));

    let output = `Key type: ${keyType}`;

    if (showFingerprints) {
      const sha256 = base64Encode(new Uint8Array(await crypto.subtle.digest('SHA-256', inputKey))).replace(/=+$/, '');
      output += `\nMD5 fingerprint: ${bytesToHex(md5(inputKey), ':')}`;
      output += `\nSHA256 fingerprint: SHA256:${sha256}`;
    }

    if (keyType === 'ssh-rsa') {
      output += `\nExponent: 0x${fields[1]}`;
      output += `\nModulus: 0x${fields[2]}`;
    } else if (keyType === 'ssh-dss') {
      output += `\np: 0x${fields[1]}`;
      output += `\nq: 0x${fields[2]}`;
      output += `\ng: 0x${fields[3]}`;
      output += `\ny: 0x${fields[4]}`;
    } else if (keyType.startsWith('ecdsa-sha2')) {
      output += `\nCurve: ${decodeLatin1(parseHex(fields[1]))}`;
      output += `\nPoint: 0x${fields.slice(2)}`;
    } else if (keyType === 'ssh-ed25519') {
      output += `\nx: 0x${fields[1]}`;
    } else {
      output += '\nUnsupported key type.';
      output += `\nParameters: ${fields.slice(1)}`;
    }

    return output;
  }, { text: true });
