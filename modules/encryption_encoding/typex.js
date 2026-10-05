import { module } from './_cat.js';
import { A } from '../../core/registry.js';
import {
  TypexRotor, Reflector, TypexPlugboard, TypexMachine, parseRotorStr,
  TYPEX_ROTOR_PRESETS, TYPEX_REFLECTOR_PRESETS,
} from './_typex.js';

const LETTER_OPTS = [...'ABCDEFGHIJKLMNOPQRSTUVWXYZ'];

module('Typex',
  'Encipher/decipher with the WW2 Typex machine. Typex was built by the British Royal Air Force ' +
  'before WW2, based on Enigma with improvements including five rotors (the two rightmost are ' +
  'static) and interchangeable wiring cores. No genuine Typex rotor wirings are public, so example ' +
  'rotors are provided (edit the field to use your own: letters A-Z map to, in order, optionally ' +
  'followed by "<" then a list of stepping points). The reflector is a plugboard-style set of 13 ' +
  'pairs covering every letter. The input plugboard is unlike Enigma\'s: it is not restricted to ' +
  'pairs, so is entered like a rotor (26 letters, no steps).',
  [
    A.combo('1st (left-hand) rotor', TYPEX_ROTOR_PRESETS), A.boolean('1st rotor reversed', false),
    A.select('1st rotor ring setting', LETTER_OPTS), A.select('1st rotor initial value', LETTER_OPTS),
    A.combo('2nd rotor', TYPEX_ROTOR_PRESETS, TYPEX_ROTOR_PRESETS[1][1]), A.boolean('2nd rotor reversed', false),
    A.select('2nd rotor ring setting', LETTER_OPTS), A.select('2nd rotor initial value', LETTER_OPTS),
    A.combo('3rd (middle) rotor', TYPEX_ROTOR_PRESETS, TYPEX_ROTOR_PRESETS[2][1]), A.boolean('3rd rotor reversed', false),
    A.select('3rd rotor ring setting', LETTER_OPTS), A.select('3rd rotor initial value', LETTER_OPTS),
    A.combo('4th (static) rotor', TYPEX_ROTOR_PRESETS, TYPEX_ROTOR_PRESETS[3][1]), A.boolean('4th rotor reversed', false),
    A.select('4th rotor ring setting', LETTER_OPTS), A.select('4th rotor initial value', LETTER_OPTS),
    A.combo('5th (right-hand, static) rotor', TYPEX_ROTOR_PRESETS, TYPEX_ROTOR_PRESETS[4][1]), A.boolean('5th rotor reversed', false),
    A.select('5th rotor ring setting', LETTER_OPTS), A.select('5th rotor initial value', LETTER_OPTS),
    A.combo('Reflector', TYPEX_REFLECTOR_PRESETS),
    A.string('Plugboard', '', '26-letter substitution, e.g. a rotor wiring. Leave blank for none.'),
    A.select('Typex keyboard emulation', ['None', 'Encrypt', 'Decrypt']),
    A.boolean('Strict output (remove non-alphabet chars, group output)', true),
  ],
  (data, r1, r1rev, r1ring, r1init, r2, r2rev, r2ring, r2init, r3, r3rev, r3ring, r3init,
    r4, r4rev, r4ring, r4init, r5, r5rev, r5ring, r5init, reflectorStr, plugboardStr, keyboard, strict) => {
    const specs = [
      [r1, r1rev, r1ring, r1init], [r2, r2rev, r2ring, r2init], [r3, r3rev, r3ring, r3init],
      [r4, r4rev, r4ring, r4init], [r5, r5rev, r5ring, r5init],
    ];
    const rotors = specs.map(([spec, reversed, ring, init], i) => {
      const [wiring, steps] = parseRotorStr(spec, i + 1);
      return new TypexRotor(wiring.toUpperCase(), steps.toUpperCase(), reversed, ring, init);
    });
    rotors.reverse(); // Typex rotors are handled fast-to-slow internally
    const reflector = new Reflector(reflectorStr.toUpperCase());
    const plugboardMod = plugboardStr === '' ? 'ABCDEFGHIJKLMNOPQRSTUVWXYZ' : plugboardStr.toUpperCase();
    const plugboard = new TypexPlugboard(plugboardMod);

    let input = data;
    if (strict) {
      input = keyboard === 'Encrypt'
        ? input.replace(/[^A-Za-z0-9 /%£()',.-]/g, '')
        : input.replace(/[^A-Za-z]/g, '');
    }

    const typex = new TypexMachine(rotors, reflector, plugboard, keyboard);
    let result = typex.crypt(input);
    if (strict && keyboard !== 'Decrypt') {
      result = result.replace(/([A-Z]{5})(?!$)/g, '$1 ');
    }
    return result;
  }, { text: true });
