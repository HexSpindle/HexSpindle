// Helpers that run the vendored hash primitives in _hashes_lib.mjs.
import { bytesToHex } from '../../core/util.js';

let libPromise = null;
export const loadCcHashes = () => (libPromise ??= import('./_hashes_lib.mjs'));

export function byteString(data) {
  let s = '';
  for (let i = 0; i < data.length; i += 0x8000) s += String.fromCharCode.apply(null, data.subarray(i, i + 0x8000));
  return s;
}

export async function runHash(name, data, options = {}) {
  const { CryptoApi } = await loadCcHashes();
  const hasher = CryptoApi.getHasher(name, options);
  hasher.update(byteString(data));
  return CryptoApi.encoder.toHex(hasher.finalize());
}

export async function gostHash(data, { version = 1994, length = 256, sBox = 'D-A' } = {}) {
  const { GostDigest } = await loadCcHashes();
  const algorithm = version === 1994
    ? { name: 'GOST 28147', version: 1994, mode: 'HASH', sBox }
    : { name: 'GOST R 34.10', version: 2012, mode: 'HASH', length };
  return bytesToHex(new Uint8Array(new GostDigest(algorithm).digest(data)));
}

