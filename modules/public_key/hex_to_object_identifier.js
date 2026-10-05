import { module } from './_cat.js';
import { decodeOid } from './_asn1.js';
import { parseHex } from '../../core/util.js';

module('Hex to Object Identifier', 'Decodes the hex content of an ASN.1 OID into dotted notation.', [],
  (t) => decodeOid(parseHex(t)), { text: true });
