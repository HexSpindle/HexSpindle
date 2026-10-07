import { module } from './_cat.js';
import { A } from '../../core/registry.js';
import { solitaireEncode } from './_classical_ciphers.js';

module('Solitaire/Pontifex Encode', "Bruce Schneier's Solitaire (Pontifex) cipher using the ordered 54-card deck and official passphrase keying procedure. Input is reduced to A-Z; optional X padding completes five-letter groups.",
  [A.string('Passphrase', ''), A.boolean('Pad with X to multiple of 5', true)],
  (t, passphrase, pad) => solitaireEncode(t, passphrase, pad), { text: true });
