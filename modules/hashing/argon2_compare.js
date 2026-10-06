import { module } from './_cat.js';
import { A } from '../../core/registry.js';
import { base64Decode, bytesEqual, decodeUtf8 } from '../../core/util.js';
import { argon2, TYPE_D, TYPE_I, TYPE_ID } from './argon2.js';

const TYPE_BY_NAME = { argon2id: TYPE_ID, argon2i: TYPE_I, argon2d: TYPE_D };

function parsePhc(h) {
  const m = /^\$(argon2id|argon2i|argon2d)\$v=(\d+)\$m=(\d+),t=(\d+),p=(\d+)\$([^$]+)\$([^$]+)$/.exec(h);
  if (!m) throw new Error('Not a valid Argon2 hash');
  const [, name, version, mem, time, par, saltB64, hashB64] = m;
  if (version !== '19') throw new Error('Not a valid Argon2 hash: unsupported version ' + version);
  return {
    type: TYPE_BY_NAME[name], memCost: parseInt(mem, 10), timeCost: parseInt(time, 10),
    parallelism: parseInt(par, 10), salt: base64Decode(saltB64), hash: base64Decode(hashB64),
  };
}

module('Argon2 compare', 'Checks whether the input matches an Argon2 hash (as produced by the Argon2 operation).', [A.string('Hash', '')],
  (data, h) => {
    let parsed;
    try { parsed = parsePhc(h.trim()); } catch { return 'No match'; }
    const recomputed = argon2(parsed.type, data, parsed.salt, parsed.timeCost, parsed.memCost, parsed.parallelism, parsed.hash.length);
    return bytesEqual(recomputed, parsed.hash) ? `Match: ${decodeUtf8(data)}` : 'No match';
  });
