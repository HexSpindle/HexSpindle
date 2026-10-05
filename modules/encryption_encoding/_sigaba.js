export const NUMBERS = '0123456789'.split('');

export function convToUpperCase(letter) {
  const code = letter.charCodeAt(0);
  if (code >= 97 && code <= 122) return String.fromCharCode(code - 32);
  return letter;
}

/** Base rotor: `wireSetting` is a permutation of 0..n-1 (left-to-right wiring), `rev` flips
 * both the wiring (via its inverse permutation) and the direction the position window scans. */
export class Rotor {
  constructor(wireSetting, key, rev) {
    this.state = key;
    this.numMapping = this.getNumMapping(wireSetting, rev);
    this.posMapping = this.getPosMapping(rev);
  }
  getNumMapping(wireSetting, rev) {
    if (!rev) return wireSetting;
    const length = wireSetting.length;
    const tempMapping = new Array(length);
    for (let i = 0; i < length; i++) tempMapping[wireSetting[i]] = i;
    return tempMapping;
  }
  getPosMapping(rev) {
    const length = this.numMapping.length;
    const posMapping = [];
    if (!rev) {
      for (let i = this.state; i < this.state + length; i++) {
        let res = i % length;
        if (res < 0) res += length;
        posMapping.push(res);
      }
    } else {
      for (let i = this.state; i > this.state - length; i--) {
        let res = i % length;
        if (res < 0) res += length;
        posMapping.push(res);
      }
    }
    return posMapping;
  }
  cryptNum(inputPos, direction) {
    const inpNum = this.posMapping[inputPos];
    let outNum;
    if (direction === 'leftToRight') outNum = this.numMapping[inpNum];
    else if (direction === 'rightToLeft') outNum = this.numMapping.indexOf(inpNum);
    return this.posMapping.indexOf(outNum);
  }
  step() {
    const lastNum = this.posMapping.pop();
    this.posMapping.splice(0, 0, lastNum);
    this.state = this.posMapping[0];
  }
}

/** Cipher (C) / control (R) rotor: 26 contacts, letter-based, may be reversed. */
export class CRRotor extends Rotor {
  constructor(wireSetting, key, rev = false) {
    const nums = [...wireSetting].map(CRRotor.letterToNum);
    super(nums, CRRotor.letterToNum(key), rev);
  }
  static letterToNum(letter) { return letter.charCodeAt(0) - 65; }
  static numToLetter(num) { return String.fromCharCode(num + 65); }
  crypt(inputPos, direction) {
    const outPos = this.cryptNum(CRRotor.letterToNum(inputPos), direction);
    return CRRotor.numToLetter(outPos);
  }
}

/** Index (I) rotor: 10 contacts, numeric, never reversed, never steps. */
export class IRotor extends Rotor {
  constructor(wireSetting, key) {
    const nums = [...wireSetting].map(Number);
    super(nums, Number(key), false);
  }
  crypt(inputPos) { return this.cryptNum(inputPos, 'leftToRight'); }
}

export class CipherBank {
  constructor(rotors) { this.rotors = rotors; }
  encrypt(inputPos) {
    for (const rotor of this.rotors) inputPos = rotor.crypt(inputPos, 'leftToRight');
    return inputPos;
  }
  decrypt(inputPos) {
    for (const rotor of [...this.rotors].reverse()) inputPos = rotor.crypt(inputPos, 'rightToLeft');
    return inputPos;
  }
  step(indexInputs) {
    const logicDict = { 0: [0, 9], 1: [7, 8], 2: [5, 6], 3: [3, 4], 4: [1, 2] };
    const rotorsToMove = [];
    for (const key in logicDict) {
      const item = logicDict[key];
      for (const i of indexInputs) {
        if (item.includes(i)) { rotorsToMove.push(this.rotors[key]); break; }
      }
    }
    for (const rotor of rotorsToMove) rotor.step();
  }
}

export class ControlBank {
  constructor(rotors) { this.rotors = [...rotors].reverse(); }
  crypt(inputPos) {
    for (const rotor of this.rotors) inputPos = rotor.crypt(inputPos, 'rightToLeft');
    return inputPos;
  }
  getOutputs() {
    const outputs = [this.crypt('F'), this.crypt('G'), this.crypt('H'), this.crypt('I')];
    const logicDict = { 1: 'B', 2: 'C', 3: 'DE', 4: 'FGH', 5: 'IJK', 6: 'LMNO', 7: 'PQRST', 8: 'UVWXYZ', 9: 'A' };
    const numberOutputs = [];
    for (const key in logicDict) {
      const item = logicDict[key];
      for (const output of outputs) {
        if (item.includes(output)) { numberOutputs.push(key); break; }
      }
    }
    return numberOutputs;
  }
  step() {
    const MRotor = this.rotors[1], FRotor = this.rotors[2], SRotor = this.rotors[3];
    if (FRotor.state === 14) {
      if (MRotor.state === 14) SRotor.step();
      MRotor.step();
    }
    FRotor.step();
  }
  goThroughControl() {
    const outputs = this.getOutputs();
    this.step();
    return outputs;
  }
}

export class IndexBank {
  constructor(rotors) { this.rotors = rotors; }
  crypt(inputPos) {
    for (const rotor of this.rotors) inputPos = rotor.crypt(inputPos);
    return inputPos;
  }
  goThroughIndex(controlInputs) {
    return controlInputs.map(inp => this.crypt(inp));
  }
}

export class SigabaMachine {
  constructor(cipherRotors, controlRotors, indexRotors) {
    this.cipherBank = new CipherBank(cipherRotors);
    this.controlBank = new ControlBank(controlRotors);
    this.indexBank = new IndexBank(indexRotors);
  }
  step() {
    const controlOut = this.controlBank.goThroughControl();
    const indexOut = this.indexBank.goThroughIndex(controlOut);
    this.cipherBank.step(indexOut);
  }
  encryptLetter(letter) {
    letter = convToUpperCase(letter);
    if (letter === ' ') letter = 'Z';
    else if (letter === 'Z') letter = 'X';
    const encryptedLetter = this.cipherBank.encrypt(letter);
    this.step();
    return encryptedLetter;
  }
  decryptLetter(letter) {
    letter = convToUpperCase(letter);
    let decryptedLetter = this.cipherBank.decrypt(letter);
    if (decryptedLetter === 'Z') decryptedLetter = ' ';
    this.step();
    return decryptedLetter;
  }
  encrypt(msg) {
    let out = '';
    for (const letter of msg) out += this.encryptLetter(letter);
    return out;
  }
  decrypt(msg) {
    let out = '';
    for (const letter of msg) out += this.decryptLetter(letter);
    return out;
  }
}

export const CR_ROTOR_PRESETS = [
  ['Example 1', 'SRGWANHPJZFXVIDQCEUKBYOLMT'],
  ['Example 2', 'THQEFSAZVKJYULBODCPXNIMWRG'],
  ['Example 3', 'XDTUYLEVFNQZBPOGIRCSMHWKAJ'],
  ['Example 4', 'LOHDMCWUPSTNGVXYFJREQIKBZA'],
  ['Example 5', 'ERXWNZQIJYLVOFUMSGHTCKPBDA'],
  ['Example 6', 'FQECYHJIOUMDZVPSLKRTGWXBAN'],
  ['Example 7', 'TBYIUMKZDJSOPEWXVANHLCFQGR'],
  ['Example 8', 'QZUPDTFNYIAOMLEBWJXCGHKRSV'],
  ['Example 9', 'CZWNHEMPOVXLKRSIDGJFYBTQAU'],
  ['Example 10', 'ENPXJVKYQBFZTICAGMOHWRLDUS'],
];
export const I_ROTOR_PRESETS = [
  ['Example 1', '6201348957'],
  ['Example 2', '6147253089'],
  ['Example 3', '8239647510'],
  ['Example 4', '7194835260'],
  ['Example 5', '4873205916'],
];
