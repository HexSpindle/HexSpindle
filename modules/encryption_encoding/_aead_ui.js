import { parseHex, decodeLatin1, bytesToHex } from '../../core/util.js';

export function parseData(data, inputMode) {
  return inputMode === 'Hex' ? parseHex(decodeLatin1(data)) : data;
}

export function renderData(bytes, outputMode) {
  return outputMode === 'Hex' ? bytesToHex(bytes) : bytes;
}

export function requireLength(bytes, allowed, label) {
  if (!allowed.includes(bytes.length)) {
    throw new Error(`${label} must be ${allowed.join(', ')} bytes (got ${bytes.length})`);
  }
}

export function requireNonce(bytes, min, max, label = 'Nonce') {
  if (bytes.length < min || bytes.length > max) {
    throw new Error(`${label} must be ${min}${min === max ? '' : `-${max}`} bytes (got ${bytes.length})`);
  }
}

export function parseSivAad(text) {
  const s = String(text ?? '').trim();
  if (!s) return [];
  return s.split(/\r?\n|;/)
    .map(x => x.trim())
    .filter(Boolean)
    .map((x, i) => {
      try { return parseHex(x); }
      catch (e) { throw new Error(`Invalid AES-SIV associated-data component ${i + 1}: ${e.message}`); }
    });
}
