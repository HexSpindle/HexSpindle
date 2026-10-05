import { module } from './_cat.js';
import { bytesToHex } from '../../core/util.js';

module('SHA1', 'SHA-1 hash (160-bit) via the browser’s native Web Crypto API. Broken for collision resistance - use SHA-2/3 for anything security-sensitive.', [],
  async (data) => bytesToHex(new Uint8Array(await crypto.subtle.digest('SHA-1', data))));
