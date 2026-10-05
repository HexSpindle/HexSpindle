import { module } from './_cat.js';
import { A } from '../../core/registry.js';
import { bytesToHex } from '../../core/util.js';

module('SHA2', 'SHA-2 family hash via the browser’s native Web Crypto API (256/384/512 only - see notes).', [A.select('Size', ['256', '384', '512'])],
  async (data, size) => bytesToHex(new Uint8Array(await crypto.subtle.digest('SHA-' + size, data))));
