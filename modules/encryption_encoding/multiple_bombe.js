import { module } from './_cat.js';
import { A } from '../../core/registry.js';
import { Reflector, ROTORS, ROTORS_FOURTH, REFLECTORS } from './_enigma_lib.js';
import { BombeMachine } from './_bombe.js';

function rotorsFormat(rotors, s, n) {
  return rotors.slice(s, n).map(r => r[1]).join('\n');
}

const PRESETS = {
  'German Service Enigma (First - 3 rotor)': [rotorsFormat(ROTORS, 0, 5), '', rotorsFormat(REFLECTORS, 0, 1)],
  'German Service Enigma (Second - 3 rotor)': [rotorsFormat(ROTORS, 0, 8), '', rotorsFormat(REFLECTORS, 0, 2)],
  'German Service Enigma (Third - 4 rotor)': [rotorsFormat(ROTORS, 0, 8), rotorsFormat(ROTORS_FOURTH, 1, 2), rotorsFormat(REFLECTORS, 2, 3)],
  'German Service Enigma (Fourth - 4 rotor)': [rotorsFormat(ROTORS, 0, 8), rotorsFormat(ROTORS_FOURTH, 1, 3), rotorsFormat(REFLECTORS, 2, 4)],
  'User defined': ['', '', ''],
};

function choose(n, k) {
  let res = 1;
  for (let i = 1; i <= k; i++) res *= (n + 1 - i) / i;
  return res;
}

function validateRotor(rstr) {
  const idx = rstr.indexOf('<');
  if (idx !== -1) rstr = rstr.slice(0, idx);
  rstr = rstr.toUpperCase();
  if (!/^[A-Z]{26}$/.test(rstr) || new Set(rstr).size !== 26) throw new Error('Rotor wiring must be 26 unique uppercase letters');
  return rstr;
}

module('Multiple Bombe',
  'Emulation of the Bombe machine used to attack Enigma. This version runs the Bombe against ' +
  'every combination of rotor order (and 4th rotor / reflector, if more than one is given) to ' +
  'handle an unknown rotor configuration. Test the menu with the plain ‘Bombe’ ' +
  'operation first. Give one rotor wiring per line in ‘Main rotors’ (at least 3); ' +
  'optionally one or more 4th-rotor wirings and/or reflectors, one per line — every ' +
  'combination of 3 of the main rotors (in every order) with each 4th rotor and reflector is ' +
  'tried. The ‘Standard Enigmas’ preset fills in the three fields with the historical ' +
  'rotor sets when they are left blank.',
  [
    A.select('Standard Enigmas', Object.keys(PRESETS)),
    A.area('Main rotors (one wiring per line, 3+)', ''),
    A.area('4th rotor (one wiring per line, optional)', ''),
    A.area('Reflectors (one per line)', ''),
    A.string('Crib (known plaintext)', ''),
    A.number('Crib offset', 0, 0),
    A.boolean('Use checking machine', true),
  ],
  (data, preset, mainRotorsStr, fourthRotorsStr, reflectorsStr, crib, offset, check) => {
    if (mainRotorsStr === '' && fourthRotorsStr === '' && reflectorsStr === '' && preset !== 'User defined') {
      [mainRotorsStr, fourthRotorsStr, reflectorsStr] = PRESETS[preset];
    }
    if (crib.length === 0) throw new Error('Crib cannot be empty');
    if (offset < 0) throw new Error('Offset cannot be negative');

    const rotors = mainRotorsStr.split('\n').filter(Boolean).map(validateRotor);
    if (rotors.length < 3) throw new Error('A minimum of three rotors must be supplied');
    const fourthRotors = fourthRotorsStr !== '' ? fourthRotorsStr.split('\n').filter(Boolean).map(validateRotor) : [''];
    const reflectors = reflectorsStr.split('\n').filter(Boolean).map(s => new Reflector(s.toUpperCase()));
    if (reflectors.length === 0) throw new Error('A minimum of one reflector must be supplied');

    const input = data.replace(/[^A-Za-z]/g, '').toUpperCase();
    const cribClean = crib.replace(/[^A-Za-z]/g, '').toUpperCase();
    const ciphertext = input.slice(offset);

    let bombe;
    const bombeRuns = [];
    let nLoops;
    for (const rotor1 of rotors) {
      for (const rotor2 of rotors) {
        if (rotor2 === rotor1) continue;
        for (const rotor3 of rotors) {
          if (rotor3 === rotor2 || rotor3 === rotor1) continue;
          for (const rotor4 of fourthRotors) {
            for (const reflector of reflectors) {
              const runRotors = [rotor1, rotor2, rotor3];
              if (rotor4 !== '') runRotors.push(rotor4);
              if (bombe === undefined) {
                bombe = new BombeMachine(runRotors, reflector, ciphertext, cribClean, check);
                nLoops = bombe.nLoops;
              } else {
                bombe.changeRotors(runRotors, reflector);
              }
              const result = bombe.run();
              if (result.length > 0) bombeRuns.push({ rotors: runRotors, reflector: reflector.pairs, result });
            }
          }
        }
      }
    }

    let out = `Bombe run on menu with ${nLoops} loop${nLoops === 1 ? '' : 's'} (2+ desirable). `
      + 'Rotors and rotor positions are listed left to right, ignore stepping and the ring '
      + 'setting, and positions start at the beginning of the crib. Some plugboard settings are '
      + 'determined. A decryption preview starting at the beginning of the crib and ignoring '
      + 'stepping is also provided.\n';
    if (bombeRuns.length === 0) out += '\n(no stops)\n';
    for (const run of bombeRuns) {
      out += `\nRotors: ${[...run.rotors].reverse().join(', ')}\nReflector: ${run.reflector}\n`;
      out += 'Rotor stops\tPartial plugboard\tDecryption preview\n';
      for (const [setting, stecker, decrypt] of run.result) out += `${setting}\t${stecker}\t${decrypt}\n`;
    }
    return out;
  }, { text: true });
