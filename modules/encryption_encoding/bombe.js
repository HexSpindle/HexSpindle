import { module } from './_cat.js';
import { A } from '../../core/registry.js';
import { Reflector, ROTORS, ROTORS_FOURTH, REFLECTORS } from './_enigma_lib.js';
import { BombeMachine } from './_bombe.js';

function stripSteps(rstr) {
  const idx = rstr.indexOf('<');
  return idx === -1 ? rstr : rstr.slice(0, idx);
}

export function buildRotorList(model, rotor4, rotorL, rotorM, rotorR) {
  const rotors = [];
  for (let i = 0; i < 4; i++) {
    if (i === 0 && model === '3-rotor') continue;
    const rstr = [rotor4, rotorL, rotorM, rotorR][i];
    rotors.push(stripSteps(rstr).toUpperCase());
  }
  rotors.reverse();
  return rotors;
}

export function formatBombeResults(nLoops, result, rotorLabel) {
  let out = `Bombe run on menu with ${nLoops} loop${nLoops === 1 ? '' : 's'} (2+ desirable). `
    + 'Rotor positions are listed left to right and start at the beginning of the crib, and '
    + 'ignore stepping and the ring setting. Some plugboard settings are determined. A decryption '
    + 'preview starting at the beginning of the crib and ignoring stepping is also provided.\n\n';
  if (result.length === 0) {
    out += '(no stops)\n';
    return out;
  }
  const header = rotorLabel ? ['Rotors', 'Rotor stops', 'Partial plugboard', 'Decryption preview'] : ['Rotor stops', 'Partial plugboard', 'Decryption preview'];
  out += header.join('\t') + '\n';
  for (const row of result) {
    const [setting, stecker, decrypt] = row.slice(row.length - 3);
    const cells = rotorLabel ? [rotorLabel, setting, stecker, decrypt] : [setting, stecker, decrypt];
    out += cells.join('\t') + '\n';
  }
  return out;
}

module('Bombe',
  'Emulation of the Bombe machine used at Bletchley Park to attack Enigma, based on work by ' +
  'Polish and British cryptanalysts. Needs a ‘crib’ (known plaintext for a chunk of the ' +
  'ciphertext) and the rotors used (see ‘Multiple Bombe’ if the rotors are unknown). The ' +
  'machine suggests possible configurations of the Enigma: rotor start positions (left to right) ' +
  'and known plugboard pairs. Enigma cannot encrypt a letter to itself, which rules out some crib ' +
  'positions; the Bombe also does not simulate the middle rotor’s stepping, so longer cribs ' +
  'risk a step happening within them, but are otherwise better (more ‘loops’ in the menu ' +
  'is better still). Output is not sufficient to fully decrypt the data; recover the rest of the ' +
  'plugboard by inspection, and adjust ring/start position if the decryption preview degrades ' +
  'partway through. The checking machine verifies stops and discards invalid ones; disable it to ' +
  'see every hardware stop.',
  [
    A.select('Model', ['3-rotor', '4-rotor']),
    A.combo('Left-most (4th) rotor', ROTORS_FOURTH),
    A.combo('Left-hand rotor', ROTORS), A.combo('Middle rotor', ROTORS, ROTORS[1][1]), A.combo('Right-hand rotor', ROTORS, ROTORS[2][1]),
    A.combo('Reflector', REFLECTORS),
    A.string('Crib (known plaintext)', ''),
    A.number('Crib offset', 0, 0),
    A.boolean('Use checking machine', true),
  ],
  (data, model, rotor4, rotorL, rotorM, rotorR, reflectorStr, crib, offset, check) => {
    const rotors = buildRotorList(model, rotor4, rotorL, rotorM, rotorR);
    if (crib.length === 0) throw new Error('Crib cannot be empty');
    if (offset < 0) throw new Error('Offset cannot be negative');
    const input = data.replace(/[^A-Za-z]/g, '').toUpperCase();
    const cribClean = crib.replace(/[^A-Za-z]/g, '').toUpperCase();
    const ciphertext = input.slice(offset);
    const reflector = new Reflector(reflectorStr.toUpperCase());
    const bombe = new BombeMachine(rotors, reflector, ciphertext, cribClean, check);
    const result = bombe.run();
    return formatBombeResults(bombe.nLoops, result);
  }, { text: true });
