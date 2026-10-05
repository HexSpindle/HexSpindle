import { module } from './_cat.js';
import { encodeOid } from './_asn1.js';
import { bytesToHex } from '../../core/util.js';

module('Object Identifier to Hex', 'Encodes a dotted OID as hex (content octets).', [],
  (t) => bytesToHex(encodeOid(t.trim())), { text: true });
