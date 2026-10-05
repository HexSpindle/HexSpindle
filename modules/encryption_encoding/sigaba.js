import { module } from './_cat.js';
import { A } from '../../core/registry.js';
import { CRRotor, IRotor, SigabaMachine, CR_ROTOR_PRESETS, I_ROTOR_PRESETS } from './_sigaba.js';

const LETTER_OPTS = [...'ABCDEFGHIJKLMNOPQRSTUVWXYZ'];
const DIGIT_OPTS = [...'0123456789'];

function crArgs(label) {
  return [A.combo(`${label} wiring`, CR_ROTOR_PRESETS), A.boolean(`${label} reversed`, false), A.select(`${label} initial value`, LETTER_OPTS)];
}
function iArgs(label) {
  return [A.combo(`${label} wiring`, I_ROTOR_PRESETS), A.select(`${label} initial value`, DIGIT_OPTS)];
}

module('SIGABA',
  'Encipher/decipher with the WW2 SIGABA machine (ECM Mark II). Used by the United States for ' +
  'message encryption from WW2 into the 1950s; unlike Enigma, it was never broken. SIGABA has 15 ' +
  'rotors: 5 cipher rotors, plus 10 (5 control + 5 index) that control the cipher rotors’ ' +
  'stepping — far more complex than Enigma’s stepping. All example rotor wirings are ' +
  'randomised (no genuine SIGABA wirings are public). For cipher/control rotors, enter 26 letters ' +
  'mapping A-Z in order; for index rotors, enter the 10 digits 0-9 in order. Encryption and ' +
  'decryption are not symmetric with the same settings, so choose the mode first.',
  [
    ...crArgs('1st (left-hand) cipher rotor'), ...crArgs('2nd cipher rotor'), ...crArgs('3rd (middle) cipher rotor'),
    ...crArgs('4th cipher rotor'), ...crArgs('5th (right-hand) cipher rotor'),
    ...crArgs('1st (left-hand) control rotor'), ...crArgs('2nd control rotor'), ...crArgs('3rd (middle) control rotor'),
    ...crArgs('4th control rotor'), ...crArgs('5th (right-hand) control rotor'),
    ...iArgs('1st (left-hand) index rotor'), ...iArgs('2nd index rotor'), ...iArgs('3rd (middle) index rotor'),
    ...iArgs('4th index rotor'), ...iArgs('5th (right-hand) index rotor'),
    A.select('SIGABA mode', ['Encrypt', 'Decrypt']),
  ],
  (data, ...args) => {
    const cipherRotors = [];
    const controlRotors = [];
    const indexRotors = [];
    for (let i = 0; i < 5; i++) {
      const [wiring, reversed, init] = args.slice(i * 3, i * 3 + 3);
      cipherRotors.push(new CRRotor(wiring.toUpperCase(), init, reversed));
    }
    for (let i = 5; i < 10; i++) {
      const [wiring, reversed, init] = args.slice(i * 3, i * 3 + 3);
      controlRotors.push(new CRRotor(wiring.toUpperCase(), init, reversed));
    }
    for (let i = 15; i < 20; i++) {
      const [wiring, init] = [args[i * 2], args[i * 2 + 1]];
      indexRotors.push(new IRotor(wiring, init));
    }
    const mode = args[40];
    const sigaba = new SigabaMachine(cipherRotors, controlRotors, indexRotors);
    return mode === 'Encrypt' ? sigaba.encrypt(data) : sigaba.decrypt(data);
  }, { text: true });
