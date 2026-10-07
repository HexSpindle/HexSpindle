import { module } from './_cat.js';
import { A } from '../../core/registry.js';
import { vicEncode } from './_classical_ciphers.js';

module('VIC Cipher Encode', 'VIC hand cipher profile: key schedule from phrase/date/personal number/keygroup, AT ONE SIR straddling checkerboard with triple-digit number shift, standard columnar transposition, disrupted diagonal transposition, and date-positioned clear keygroup. Historical message bisection can be reproduced with a shared cut position.',
  [A.string('Phrase (20+ letters)', "'Twas the night before Christmas"), A.string('Date digits (6+, e.g. 139195)', '139195'), A.number('Personal number', 6, 1, 99), A.string('5-digit keygroup', '72401'), A.boolean('Pad checkerboard digits to multiple of 5', false), A.number('Bisection cut position (0 = off)', 0, 0)],
  (t, phrase, date, personal, keygroup, pad, cut) => vicEncode(t, phrase, date, personal, keygroup, pad, cut), { text: true });
