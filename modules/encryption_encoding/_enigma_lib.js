export const LETTERS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');
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

class PairMapBase {
  constructor(pairs, name = 'PairMapBase') {
    this.pairs = pairs;
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

export class Plugboard extends PairMapBase {
  constructor(pairs) { super(pairs, 'Plugboard'); }
}

export const ROTORS = [
  ['I', 'EKMFLGDQVZNTOWYHXUSPAIBRCJ<R'], ['II', 'AJDKSIRUXBLHWTMCQGZNPYFVOE<F'], ['III', 'BDFHJLCPRTXVZNYEIWGAKMUSQO<W'],
  ['IV', 'ESOVPZJAYQUIRHXLNFTGKDCMWB<K'], ['V', 'VZBRGITYUPSDNHLXAWMJQOFECK<A'], ['VI', 'JPGVOUMFYQBENHZRDKASXLICTW<AN'],
  ['VII', 'NZJHGRCXMYSWBOUFAIVLPEKQDT<AN'], ['VIII', 'FKQHTLXOCBJSPDZRAMEWNIUYGV<AN'],
];
export const ROTORS_FOURTH = [['Beta', 'LEYJVCNIXWPBQMDRTAKZGFUHOS'], ['Gamma', 'FSOKANUERHMBTIYCWLQPZXVGJD']];
export const REFLECTORS = [
  ['B', 'AY BR CU DH EQ FS GL IP JX KN MO TZ VW'], ['C', 'AF BV CP DJ EI GO HY KR LZ MX NW TQ SU'],
  ['B Thin', 'AE BN CK DQ FU GY HW IJ LO MP RX SZ TV'], ['C Thin', 'AR BD CO EJ FN GT HK IV LM PW QZ SX UY'],
];
