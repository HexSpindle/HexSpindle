const LETTERS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
export const mod = (n, m) => ((n % m) + m) % m;

export function a2i(c, permissive = false) {
  const code = c.charCodeAt(0);
  if (code >= 65 && code <= 90) return code - 65;
  if (permissive) {
    if (code >= 97 && code <= 122) return code - 97;
    return -1;
  }
  throw new Error('a2i called on non-uppercase ASCII character');
}
export function i2a(i) {
  if (i >= 0 && i < 26) return LETTERS[i];
  throw new Error('i2a called on value outside 0..25');
}

export class Rotor {
  constructor(wiring, steps, ringSetting, initialPosition) {
    if (!/^[A-Z]{26}$/.test(wiring)) throw new Error('Rotor wiring must be 26 unique uppercase letters');
    if (!/^[A-Z]{0,26}$/.test(steps)) throw new Error('Rotor steps must be 0-26 unique uppercase letters');
    if (!/^[A-Z]$/.test(ringSetting)) throw new Error('Rotor ring setting must be exactly one uppercase letter');
    if (!/^[A-Z]$/.test(initialPosition)) throw new Error('Rotor initial position must be exactly one uppercase letter');
    this.map = new Array(26);
    this.revMap = new Array(26);
    const uniq = new Set();
    for (let i = 0; i < LETTERS.length; i++) {
      const a = a2i(LETTERS[i]), b = a2i(wiring[i]);
      this.map[a] = b; this.revMap[b] = a; uniq.add(b);
    }
    if (uniq.size !== LETTERS.length) throw new Error('Rotor wiring must have each letter exactly once');
    const rs = a2i(ringSetting);
    this.steps = new Set();
    for (const x of steps) this.steps.add(mod(a2i(x) - rs, 26));
    if (this.steps.size !== steps.length) throw new Error('Rotor steps must be unique');
    this.pos = mod(a2i(initialPosition) - rs, 26);
  }
  step() { this.pos = mod(this.pos + 1, 26); return this.pos; }
  transform(c) { return mod(this.map[mod(c + this.pos, 26)] - this.pos, 26); }
  revTransform(c) { return mod(this.revMap[mod(c + this.pos, 26)] - this.pos, 26); }
}

/** Typex rotor: like Enigma's, but no inherent ring quirk beyond the base, and may be fitted
 * reversed (the wiring is re-derived by mirroring both sides of the mapping through the
 * alphabet before constructing the underlying Rotor). */
export class TypexRotor extends Rotor {
  constructor(wiring, steps, reversed, ringSetting, initialPos) {
    let wiringMod = wiring;
    if (reversed) {
      const outMap = new Array(26);
      for (let i = 0; i < 26; i++) {
        const input = mod(26 - a2i(wiring[i]), 26);
        const output = i2a(mod(26 - a2i(LETTERS[i]), 26));
        outMap[input] = output;
      }
      wiringMod = outMap.join('');
    }
    super(wiringMod, steps, ringSetting, initialPos);
  }
}

class PairMapBase {
  constructor(pairs, name = 'PairMapBase') {
    this.map = {};
    if (pairs === '') return;
    for (const pair of pairs.split(/\s+/)) {
      if (!/^[A-Z]{2}$/.test(pair)) throw new Error(`${name} must be a whitespace-separated list of uppercase letter pairs`);
      const a = a2i(pair[0]), b = a2i(pair[1]);
      if (a === b) continue;
      if (a in this.map) throw new Error(`${name} connects ${pair[0]} more than once`);
      if (b in this.map) throw new Error(`${name} connects ${pair[1]} more than once`);
      this.map[a] = b; this.map[b] = a;
    }
  }
  transform(c) { return (c in this.map) ? this.map[c] : c; }
  revTransform(c) { return this.transform(c); }
}

export class Reflector extends PairMapBase {
  constructor(pairs) {
    super(pairs, 'Reflector');
    if (Object.keys(this.map).length !== 26) throw new Error('Reflector must have exactly 13 pairs covering every letter');
    const opt = new Array(26);
    for (const k of Object.keys(this.map)) opt[k] = this.map[k];
    this.map = opt;
  }
  transform(c) { return this.map[c]; }
}

/** Typex's input plugboard: an arbitrary 26-letter substitution, built from a Rotor fixed at
 * ring/position A (so stepping never applies) with its wiring mirrored to account for Typex
 * wiring its input in the opposite rotation to Enigma's plugboard. */
export class TypexPlugboard extends Rotor {
  constructor(wiring) {
    if (!/^[A-Z]{26}$/.test(wiring)) throw new Error('Plugboard wiring must be 26 unique uppercase letters');
    const reversed = 'AZYXWVUTSRQPONMLKJIHGFEDCB';
    const wiringMod = [...wiring].map(x => reversed[a2i(x)]).join('');
    super(wiringMod, '', 'A', 'A');
  }
}

export const KEYBOARD = {
  Q: '1', W: '2', E: '3', R: '4', T: '5', Y: '6', U: '7', I: '8', O: '9', P: '0',
  A: '-', S: '/', D: 'Z', F: '%', G: 'X', H: '£', K: '(', L: ')',
  C: 'V', B: "'", N: ',', M: '.',
};
export const KEYBOARD_REV = {};
for (const k of Object.keys(KEYBOARD)) KEYBOARD_REV[KEYBOARD[k]] = k;

/** Typex machine: five rotors (fast-to-slow order), of which only the three slowest step,
 * using the same double-stepping logic as Enigma but offset two positions to the left. */
export class TypexMachine {
  constructor(rotors, reflector, plugboard, keyboard) {
    if (rotors.length !== 5) throw new Error('Typex must have 5 rotors');
    this.rotors = rotors;
    this.rotorsRev = [...rotors].reverse();
    this.reflector = reflector;
    this.plugboard = plugboard;
    this.keyboard = keyboard;
  }
  step() {
    const r0 = this.rotors[2], r1 = this.rotors[3];
    r0.step();
    if (r0.steps.has(r0.pos) || r1.steps.has(mod(r1.pos + 1, 26))) {
      r1.step();
      if (r1.steps.has(r1.pos)) this.rotors[4].step();
    }
  }
  cryptRaw(input) {
    let result = '';
    for (const c of input) {
      let letter = a2i(c, true);
      if (letter === -1) { result += c; continue; }
      this.step();
      letter = this.plugboard.transform(letter);
      for (const rotor of this.rotors) letter = rotor.transform(letter);
      letter = this.reflector.transform(letter);
      for (const rotor of this.rotorsRev) letter = rotor.revTransform(letter);
      letter = this.plugboard.revTransform(letter);
      result += i2a(letter);
    }
    return result;
  }
  crypt(input) {
    let inputMod = input;
    if (this.keyboard === 'Encrypt') {
      inputMod = '';
      let mode = false;
      for (const x of input) {
        if (x === ' ') {
          inputMod += 'X';
        } else if (mode) {
          if (Object.prototype.hasOwnProperty.call(KEYBOARD_REV, x)) inputMod += KEYBOARD_REV[x];
          else { mode = false; inputMod += 'V' + x; }
        } else {
          if (Object.prototype.hasOwnProperty.call(KEYBOARD_REV, x)) { mode = true; inputMod += 'Z' + KEYBOARD_REV[x]; }
          else inputMod += x;
        }
      }
    }
    const output = this.cryptRaw(inputMod);
    let outputMod = output;
    if (this.keyboard === 'Decrypt') {
      outputMod = '';
      let mode = false;
      for (const x of output) {
        if (x === 'X') outputMod += ' ';
        else if (x === 'V') mode = false;
        else if (x === 'Z') mode = true;
        else if (mode) outputMod += KEYBOARD[x];
        else outputMod += x;
      }
    }
    return outputMod;
  }
}

/** Parse a rotor spec string "WIRING" or "WIRING<STEPS" into [wiring, steps]. */
export function parseRotorStr(rotor, i) {
  if (rotor === '') throw new Error(`Rotor ${i} must be provided.`);
  if (!rotor.includes('<')) return [rotor, ''];
  const idx = rotor.indexOf('<');
  return [rotor.slice(0, idx), rotor.slice(idx + 1)];
}

export const TYPEX_ROTOR_PRESETS = [
  ['Example 1', 'MCYLPQUVRXGSAOWNBJEZDTFKHI<BFHNQUW'],
  ['Example 2', 'KHWENRCBISXJQGOFMAPVYZDLTU<BFHNQUW'],
  ['Example 3', 'BYPDZMGIKQCUSATREHOJNLFWXV<BFHNQUW'],
  ['Example 4', 'ZANJCGDLVHIXOBRPMSWQUKFYET<BFHNQUW'],
  ['Example 5', 'QXBGUTOVFCZPJIHSWERYNDAMLK<BFHNQUW'],
  ['Example 6', 'BDCNWUEIQVFTSXALOGZJYMHKPR<BFHNQUW'],
  ['Example 7', 'WJUKEIABMSGFTQZVCNPHORDXYL<BFHNQUW'],
  ['Example 8', 'TNVCZXDIPFWQKHSJMAOYLEURGB<BFHNQUW'],
];
export const TYPEX_REFLECTOR_PRESETS = [
  ['Example', 'AN BC FG IE KD LU MH OR TS VZ WQ XJ YP'],
];
