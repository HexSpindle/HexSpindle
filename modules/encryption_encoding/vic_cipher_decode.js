import { module } from './_cat.js';
import { A } from '../../core/registry.js';
import { vicDecode } from './_classical_ciphers.js';

module('VIC Cipher Decode', 'Extracts the clear keygroup at the position indicated by the sixth date digit, regenerates the VIC keys, reverses disrupted and standard transpositions, then decodes the straddling checkerboard. If encryption used bisection, provide the same cut position.',
  [A.string('Phrase (20+ letters)', "'Twas the night before Christmas"), A.string('Date digits (6+, e.g. 139195)', '139195'), A.number('Personal number', 6, 1, 99), A.number('Bisection cut position (0 = off)', 0, 0)],
  (t, phrase, date, personal, cut) => vicDecode(t, phrase, date, personal, cut), { text: true });
