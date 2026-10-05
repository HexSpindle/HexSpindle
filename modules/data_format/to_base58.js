import { module } from './_cat.js';
import { A } from '../../core/registry.js';
import { bytesToBase } from './_base.js';

export const BTC = '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz';
export const RIPPLE = 'rpshnaf39wBUDNEGHJKLM4PQRST7VWXYZ2bcdeCg65jkm8oFqi1tuvAxyz';

module('To Base58', 'Encodes data as Base58 (Bitcoin / Ripple alphabets).',
  [A.combo('Alphabet', [['Bitcoin', BTC], ['Ripple', RIPPLE]])],
  (data, alphabet) => bytesToBase(data, alphabet));
