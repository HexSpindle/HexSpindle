import { module } from './_cat.js';
import { A } from '../../core/registry.js';
import { bytesToHex } from '../../core/util.js';
import { runHash } from './_hash_util.js';

const WEB = { '256': 64, '384': 160, '512': 160 };

module('SHA2', 'SHA-2 family hash (SHA-224/256/384/512 and SHA-512/224, SHA-512/256), with an optional reduced number of rounds. The standard sizes use the browser’s Web Crypto API; the rest use crypto-api.',
  [A.select('Size', ['512', '384', '256', '224', '512/256', '512/224']),
    A.number('Rounds (SHA-224/256)', 64, 16), A.number('Rounds (SHA-384/512)', 160, 32)],
  async (data, size, rounds256 = 64, rounds512 = 160) => {
    const rounds = (size === '256' || size === '224') ? rounds256 : rounds512;
    if (WEB[size] === rounds) return bytesToHex(new Uint8Array(await crypto.subtle.digest('SHA-' + size, data)));
    return runHash('sha' + size, data, { rounds });
  });
