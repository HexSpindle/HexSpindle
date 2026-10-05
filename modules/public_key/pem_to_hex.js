import { module } from './_cat.js';
import { findAllPem } from './_pem.js';
import { bytesToHex } from '../../core/util.js';

module('PEM to Hex', 'Converts the Base64 body of PEM data to hex.', [],
  (t) => findAllPem(t).map(b => bytesToHex(b.der)).join('\n'), { text: true });
