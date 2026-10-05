import { module } from './_cat.js';
import { A } from '../../core/registry.js';
import { bifid } from './bifid_cipher_encode.js';

module('Bifid Cipher Decode', 'Decodes the Bifid cipher.', [A.string('Keyword', '')],
  (t, keyword) => bifid(t, keyword, true), { text: true });
