import { module } from './_cat.js';
import { bytesToHex } from '../../core/util.js';
import { asconHash256 } from './_ascon.js';

module('Ascon Hash', 'Ascon-Hash256: a 256-bit lightweight cryptographic hash from the Ascon family, standardised in NIST SP 800-232 for constrained devices such as IoT sensors and embedded systems.', [],
  (data) => bytesToHex(asconHash256(data)));
