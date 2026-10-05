export const VALID_ITA2 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ34589+-./';

export const ITA2_TABLE = {
  A: '11000', B: '10011', C: '01110', D: '10010', E: '10000', F: '10110', G: '01011', H: '00101',
  I: '01100', J: '11010', K: '11110', L: '01001', M: '00111', N: '00110', O: '00011', P: '01101',
  Q: '11101', R: '01010', S: '10100', T: '00001', U: '11100', V: '01111', W: '11001', X: '10111',
  Y: '10101', Z: '10001', 3: '00010', 4: '01000', 9: '00100', '/': '00000', ' ': '00100',
  '.': '00100', 8: '11111', 5: '11011', '-': '11111', '+': '11011',
};

export const ROTOR_SIZES = { S1: 43, S2: 47, S3: 51, S4: 53, S5: 59, M37: 37, M61: 61, X1: 41, X2: 31, X3: 29, X4: 26, X5: 23 };

const Z = (n) => new Array(n).fill(0);

export const INIT_PATTERNS = {
  'No Pattern': {
    X: { 1: Z(41), 2: Z(31), 3: Z(29), 4: Z(26), 5: Z(23) },
    S: { 1: Z(43), 2: Z(47), 3: Z(51), 4: Z(53), 5: Z(59) },
    M: { 1: Z(61), 2: Z(37) },
  },
  'KH Pattern': {
    X: {
      1: [0, 1, 0, 0, 0, 1, 1, 1, 0, 1, 0, 1, 1, 1, 1, 0, 1, 0, 0, 0, 1, 0, 1, 0, 0, 1, 1, 1, 0, 0, 0, 0, 1, 1, 0, 1, 1, 1, 1, 0, 0],
      2: [1, 0, 0, 1, 1, 1, 0, 0, 0, 1, 0, 1, 1, 1, 1, 0, 0, 1, 1, 0, 0, 1, 0, 0, 1, 1, 0, 1, 1, 0, 0],
      3: [0, 0, 1, 1, 0, 0, 1, 0, 1, 1, 1, 0, 0, 0, 1, 1, 0, 0, 0, 1, 1, 0, 0, 1, 1, 0, 1, 1, 0],
      4: [1, 1, 0, 0, 1, 0, 0, 1, 1, 1, 1, 0, 0, 1, 1, 0, 1, 1, 1, 0, 0, 0, 0, 1, 0, 0],
      5: [1, 1, 0, 0, 1, 1, 0, 0, 0, 0, 1, 1, 1, 1, 0, 1, 0, 0, 1, 0, 1, 0, 0],
    },
    S: {
      1: [0, 1, 0, 0, 0, 1, 1, 0, 1, 0, 1, 0, 0, 1, 1, 1, 0, 1, 0, 1, 0, 1, 1, 1, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 0, 1, 0, 1, 1, 0, 1],
      2: [0, 1, 1, 0, 1, 0, 1, 1, 1, 0, 0, 1, 0, 1, 0, 1, 0, 0, 1, 0, 1, 1, 0, 1, 0, 1, 1, 1, 0, 1, 0, 0, 0, 0, 1, 0, 1, 1, 0, 1, 0, 1, 0, 1, 0, 0, 1],
      3: [0, 1, 0, 1, 0, 1, 0, 0, 1, 1, 1, 0, 0, 0, 0, 1, 0, 1, 0, 1, 1, 0, 1, 0, 1, 0, 1, 0, 0, 1, 1, 1, 0, 1, 0, 1, 0, 0, 1, 0, 1, 0, 1, 1, 0, 0, 1, 0, 1, 0, 1],
      4: [0, 1, 1, 0, 0, 0, 1, 1, 1, 1, 1, 0, 1, 0, 1, 0, 1, 1, 0, 0, 0, 1, 0, 1, 1, 0, 1, 0, 1, 0, 0, 1, 0, 1, 0, 1, 1, 0, 1, 0, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0],
      5: [1, 1, 0, 0, 0, 1, 1, 0, 1, 0, 0, 1, 0, 1, 1, 0, 1, 0, 0, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 1, 0, 0, 1, 1, 1, 1, 0, 1, 0, 1, 0, 0, 0, 1, 1, 0, 1, 0, 0, 1, 0],
    },
    M: {
      1: [0, 1, 1, 1, 1, 0, 1, 1, 1, 1, 0, 1, 1, 1, 0, 1, 1, 1, 1, 0, 1, 1, 0, 0, 0, 0, 1, 1, 1, 0, 1, 1, 1, 1, 0, 1, 1, 1, 1, 0, 1, 1, 1, 1, 0, 1, 1, 1, 1, 0, 1, 1, 1, 0, 1, 1, 1, 1, 0, 0, 0],
      2: [1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 0, 0, 1, 0, 1, 0, 1, 0, 0, 0, 1, 0, 1, 0, 1, 0, 0, 0, 1, 0, 1, 0, 0, 0, 0],
    },
  },
  'ZMUG Pattern': {
    X: {
      1: [0, 1, 1, 0, 1, 1, 0, 0, 0, 1, 1, 0, 1, 1, 0, 0, 1, 0, 0, 0, 0, 1, 1, 1, 0, 0, 1, 1, 1, 0, 0, 0, 0, 1, 1, 1, 0, 0, 1, 1, 0],
      2: [1, 1, 0, 1, 1, 0, 0, 0, 0, 1, 1, 1, 0, 1, 1, 1, 1, 0, 1, 0, 0, 0, 1, 1, 0, 0, 1, 1, 0, 0, 0],
      3: [0, 0, 1, 0, 0, 1, 1, 0, 0, 0, 1, 1, 0, 0, 0, 1, 1, 1, 0, 0, 0, 1, 1, 0, 1, 1, 1, 1, 0],
      4: [1, 0, 1, 0, 1, 0, 0, 1, 1, 0, 0, 0, 1, 1, 0, 0, 1, 0, 1, 1, 1, 0, 0, 1, 0, 1],
      5: [0, 1, 0, 0, 1, 1, 1, 1, 0, 0, 0, 1, 0, 1, 1, 1, 0, 0, 0, 0, 1, 0, 1],
    },
    S: {
      1: [1, 1, 0, 1, 0, 0, 1, 1, 0, 0, 0, 1, 1, 1, 0, 0, 1, 1, 0, 0, 0, 1, 1, 0, 0, 0, 1, 1, 1, 1, 0, 0, 1, 1, 1, 0, 0, 1, 1, 1, 0, 0, 0],
      2: [0, 0, 0, 1, 0, 0, 0, 1, 1, 1, 0, 0, 1, 1, 0, 0, 1, 1, 1, 0, 0, 0, 1, 1, 1, 1, 0, 0, 0, 1, 1, 0, 0, 1, 1, 1, 0, 0, 1, 1, 1, 0, 0, 1, 0, 1, 1],
      3: [0, 1, 0, 0, 1, 1, 0, 0, 1, 1, 1, 0, 0, 1, 1, 1, 0, 0, 1, 0, 0, 0, 1, 1, 1, 1, 0, 0, 0, 1, 0, 0, 0, 1, 1, 1, 0, 0, 0, 1, 1, 0, 0, 0, 1, 1, 0, 0, 1, 1, 1],
      4: [0, 0, 1, 1, 1, 0, 0, 1, 1, 0, 0, 1, 1, 1, 0, 0, 1, 1, 1, 1, 0, 0, 0, 1, 0, 0, 0, 1, 1, 0, 0, 1, 1, 1, 0, 0, 1, 0, 0, 1, 1, 0, 0, 0, 1, 1, 0, 0, 1, 1, 1, 0, 1],
      5: [1, 0, 0, 1, 1, 1, 0, 0, 0, 1, 0, 0, 0, 1, 1, 1, 1, 0, 0, 1, 1, 1, 0, 0, 1, 0, 0, 1, 1, 1, 1, 0, 0, 0, 1, 1, 0, 0, 1, 1, 1, 0, 0, 1, 1, 0, 0, 1, 1, 1, 0, 0, 1, 0, 0, 0, 1, 1, 0],
    },
    M: {
      1: [1, 0, 1, 1, 0, 1, 0, 1, 1, 1, 0, 1, 1, 1, 0, 1, 0, 1, 0, 1, 1, 1, 0, 1, 1, 0, 1, 1, 0, 1, 1, 0, 1, 1, 0, 1, 1, 1, 0, 1, 1, 1, 0, 1, 1, 1, 0, 1, 0, 1, 0, 1, 1, 1, 1, 0, 1, 0, 1, 0, 1],
      2: [0, 1, 0, 1, 0, 1, 1, 0, 1, 0, 1, 1, 0, 1, 1, 1, 0, 1, 1, 1, 0, 1, 1, 0, 1, 0, 1, 1, 1, 0, 1, 1, 1, 0, 1, 1, 1],
    },
  },
  'BREAM Pattern': {
    X: {
      1: [0, 1, 1, 1, 1, 0, 1, 0, 1, 1, 0, 1, 0, 1, 1, 0, 0, 1, 0, 0, 1, 1, 0, 1, 0, 0, 0, 0, 1, 1, 0, 0, 0, 0, 1, 1, 1, 1, 0, 0, 0],
      2: [0, 1, 1, 1, 0, 0, 0, 0, 1, 0, 0, 0, 1, 1, 0, 1, 0, 1, 0, 0, 0, 1, 1, 0, 1, 1, 1, 0, 0, 1, 1],
      3: [1, 1, 0, 0, 1, 1, 0, 1, 1, 0, 0, 1, 1, 1, 0, 0, 0, 0, 1, 0, 0, 1, 1, 0, 1, 1, 1, 0, 0],
      4: [1, 1, 1, 1, 0, 0, 1, 0, 0, 1, 1, 0, 0, 1, 0, 0, 1, 1, 0, 1, 0, 0, 1, 1, 0, 0],
      5: [0, 1, 1, 1, 0, 1, 1, 1, 0, 0, 0, 1, 0, 0, 1, 1, 0, 1, 0, 0, 0, 1, 0],
    },
    S: {
      1: [0, 0, 0, 1, 1, 1, 0, 0, 1, 1, 1, 0, 1, 1, 0, 0, 1, 0, 1, 0, 1, 1, 0, 1, 1, 0, 1, 0, 0, 1, 0, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 0],
      2: [1, 1, 0, 1, 0, 0, 1, 1, 1, 0, 0, 0, 0, 0, 1, 1, 1, 1, 0, 1, 0, 0, 1, 0, 1, 1, 0, 0, 1, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 1, 0, 1, 0, 0],
      3: [1, 0, 0, 1, 0, 0, 1, 1, 0, 1, 1, 1, 0, 0, 0, 1, 1, 1, 0, 0, 0, 0, 1, 1, 1, 1, 0, 1, 0, 1, 0, 1, 1, 0, 0, 1, 0, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1],
      4: [0, 1, 0, 0, 0, 0, 1, 0, 0, 1, 0, 1, 1, 1, 1, 1, 0, 1, 1, 0, 0, 1, 1, 0, 0, 1, 1, 0, 0, 0, 0, 1, 0, 1, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 1, 0, 0, 1, 0, 1],
      5: [1, 0, 1, 0, 1, 0, 0, 1, 1, 0, 0, 1, 1, 0, 1, 1, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 1, 1, 0, 1, 1, 1, 1, 0, 1, 1, 1, 0, 0, 1, 0, 1, 0, 0, 0, 1, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0],
    },
    M: {
      1: [1, 0, 0, 0, 0, 1, 1, 0, 0, 0, 1, 1, 0, 0, 1, 1, 0, 1, 1, 1, 1, 0, 0, 0, 0, 1, 1, 0, 0, 0, 1, 1, 0, 1, 1, 0, 1, 0, 1, 1, 1, 1, 0, 0, 0, 1, 1, 0, 0, 1, 1, 0, 0, 1, 1, 0, 1, 0, 1, 1, 1],
      2: [0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 1, 1, 0, 1, 0, 1, 0, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 1, 1, 0, 1],
    },
  },
};

const figShiftArr = {
  1: 'Q', 2: 'W', 3: 'E', 4: 'R', 5: 'T', 6: 'Y', 7: 'U', 8: 'I', 9: 'O', 0: 'P',
  ' ': '9', '-': 'A', '?': 'B', ':': 'C', '#': 'D', '%': 'F', '@': 'G', '£': 'H',
  '(': 'K', ')': 'L', '.': 'M', ',': 'N', "'": 'S', '=': 'V', '/': 'X', '+': 'Z',
  '\n': '3', '\r': '4',
};
const REVERSE_FIGSHIFT_TABLE = {};
for (const k of Object.keys(figShiftArr)) REVERSE_FIGSHIFT_TABLE[figShiftArr[k]] = k;

const REVERSE_ITA2_TABLE = {};
for (const letter of Object.keys(ITA2_TABLE)) REVERSE_ITA2_TABLE[ITA2_TABLE[letter]] = letter;

const validChars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ1234567890+-'()/:=?,. \n\r";
const figShiftedChars = "1234567890+-'()/:=?,.";

export function readLugs(lugstr) {
  return [...lugstr].map(c => (c === '.' ? 0 : 1));
}

export function convertToITA2(input, intype, mode) {
  let result = '';
  let figShifted = false;
  for (const character of input) {
    const letter = character.toUpperCase();
    if (intype === 'ITA2' || mode === 'Receive') {
      if (VALID_ITA2.indexOf(letter) === -1) {
        let errltr = letter;
        if (errltr === '\n') errltr = 'Carriage Return';
        if (errltr === ' ') errltr = 'Space';
        throw new Error(`Invalid ITA2 character : ${errltr}`);
      }
      result += letter;
    } else {
      if (validChars.indexOf(letter) === -1) throw new Error(`Invalid Plaintext character : ${letter}`);
      if (!figShifted && figShiftedChars.indexOf(letter) !== -1) {
        figShifted = true;
        result += '55' + figShiftArr[letter];
      } else if (figShifted) {
        if (letter === '\n') result += '34';
        else if (letter === '\r') result += '4';
        else if (figShiftedChars.indexOf(letter) === -1) { figShifted = false; result += '88' + letter; }
        else result += figShiftArr[letter];
      } else if (letter === '\n') {
        result += '34';
      } else if (letter === '\r') {
        result += '4';
      } else {
        result += letter;
      }
    }
  }
  return result;
}

export function convertFromITA2(input, outtype, mode) {
  let result = '';
  let figShifted = false;
  for (const letter of input) {
    if (mode === 'Receive') {
      if (outtype === 'Plaintext') {
        if (letter === '5' || letter === '+') figShifted = true;
        else if (letter === '8' || letter === '-') figShifted = false;
        else if (letter === '9') result += ' ';
        else if (letter === '3') result += '\n';
        else if (letter === '4') result += '';
        else if (letter === '/') result += '/';
        else result += figShifted ? REVERSE_FIGSHIFT_TABLE[letter] : letter;
      } else {
        result += letter;
      }
    } else {
      result += letter;
    }
  }
  return result;
}

export function lorenzCrypt(input, opts) {
  const { model, pattern, kt, mode, intype, outtype, format } = opts;
  let { s1, s2, s3, s4, s5, m37, m61, x1, x2, x3, x4, x5 } = opts;

  if (s1 < 1 || s1 > 43) throw new Error('Psi1 start must be between 1 and 43');
  if (s2 < 1 || s2 > 47) throw new Error('Psi2 start must be between 1 and 47');
  if (s3 < 1 || s3 > 51) throw new Error('Psi3 start must be between 1 and 51');
  if (s4 < 1 || s4 > 53) throw new Error('Psi4 start must be between 1 and 53');
  if (s5 < 1 || s5 > 59) throw new Error('Psi5 start must be between 1 and 59');
  if (m37 < 1 || m37 > 37) throw new Error('M37 start must be between 1 and 37');
  if (m61 < 1 || m61 > 61) throw new Error('M61 start must be between 1 and 61');
  if (x1 < 1 || x1 > 41) throw new Error('Chi1 start must be between 1 and 41');
  if (x2 < 1 || x2 > 31) throw new Error('Chi2 start must be between 1 and 31');
  if (x3 < 1 || x3 > 29) throw new Error('Chi3 start must be between 1 and 29');
  if (x4 < 1 || x4 > 26) throw new Error('Chi4 start must be between 1 and 26');
  if (x5 < 1 || x5 > 23) throw new Error('Chi5 start must be between 1 and 23');

  let chosenSetting;
  if (pattern === 'Custom') {
    const re = /^[.xX]*$/;
    const checks = [
      [opts.lugs1, 43, 'Psi1'], [opts.lugs2, 47, 'Psi2'], [opts.lugs3, 51, 'Psi3'],
      [opts.lugs4, 53, 'Psi4'], [opts.lugs5, 59, 'Psi5'], [opts.lugm37, 37, 'M37'],
      [opts.lugm61, 61, 'M61'], [opts.lugx1, 41, 'Chi1'], [opts.lugx2, 31, 'Chi2'],
      [opts.lugx3, 29, 'Chi3'], [opts.lugx4, 26, 'Chi4'], [opts.lugx5, 23, 'Chi5'],
    ];
    for (const [val, len, label] of checks) {
      if (val.length !== len || !re.test(val)) throw new Error(`${label} custom lugs must be ${len} long and can only include . or x`);
    }
    chosenSetting = { X: {}, S: {}, M: {} };
    chosenSetting.S[1] = readLugs(opts.lugs1);
    chosenSetting.S[2] = readLugs(opts.lugs2);
    chosenSetting.S[3] = readLugs(opts.lugs3);
    chosenSetting.S[4] = readLugs(opts.lugs4);
    chosenSetting.S[5] = readLugs(opts.lugs5);
    chosenSetting.M[1] = readLugs(opts.lugm61);
    chosenSetting.M[2] = readLugs(opts.lugm37);
    chosenSetting.X[1] = readLugs(opts.lugx1);
    chosenSetting.X[2] = readLugs(opts.lugx2);
    chosenSetting.X[3] = readLugs(opts.lugx3);
    chosenSetting.X[4] = readLugs(opts.lugx4);
    chosenSetting.X[5] = readLugs(opts.lugx5);
  } else {
    chosenSetting = INIT_PATTERNS[pattern];
    if (!chosenSetting) throw new Error(`Unknown wheel pattern: ${pattern}`);
  }
  const chiSettings = chosenSetting.X;
  const psiSettings = chosenSetting.S;
  const muSettings = chosenSetting.M;

  const ita2Input = convertToITA2(input, intype, mode);

  let m61lug = muSettings[1][m61 - 1];
  let m37lug = muSettings[2][m37 - 1];
  const p5 = [0, 0, 0];

  let out = '';
  for (const character of ita2Input) {
    const letter = character.toUpperCase();

    let x2bptr = x2 + 1;
    if (x2bptr === 32) x2bptr = 1;
    let s1bptr = s1 + 1;
    if (s1bptr === 44) s1bptr = 1;

    const thisChi = [chiSettings[1][x1 - 1], chiSettings[2][x2 - 1], chiSettings[3][x3 - 1], chiSettings[4][x4 - 1], chiSettings[5][x5 - 1]];
    const thisPsi = [psiSettings[1][s1 - 1], psiSettings[2][s2 - 1], psiSettings[3][s3 - 1], psiSettings[4][s4 - 1], psiSettings[5][s5 - 1]];

    if (typeof ITA2_TABLE[letter] === 'undefined') continue;

    const xorSum = [];
    for (let i = 0; i <= 4; i++) xorSum[i] = Number(ITA2_TABLE[letter][i]) ^ thisPsi[i] ^ thisChi[i];
    const resultStr = xorSum.join('');

    if (--x1 < 1) x1 = 41;
    if (--x2 < 1) x2 = 31;
    if (--x3 < 1) x3 = 29;
    if (--x4 < 1) x4 = 26;
    if (--x5 < 1) x5 = 23;
    if (--m61 < 1) m61 = 61;
    if (m61lug === 1) { if (--m37 < 1) m37 = 37; }

    const basicmotor = m37lug;
    let totalmotor;
    let lim = 0;

    p5[2] = p5[1];
    p5[1] = p5[0];
    p5[0] = mode === 'Send' ? Number(ITA2_TABLE[letter][4]) : Number(xorSum[4]);

    if (model === 'SZ42a') {
      lim = Number(chiSettings[2][x2bptr - 1]);
      if (kt) lim = lim === p5[2] ? 0 : 1;
      totalmotor = (basicmotor === 0 && lim === 1) ? 0 : 1;
    } else if (model === 'SZ42b') {
      const x2b1lug = Number(chiSettings[2][x2bptr - 1]);
      const s1b1lug = Number(psiSettings[1][s1bptr - 1]);
      lim = 1;
      if (x2b1lug === s1b1lug) lim = 0;
      if (kt) lim = lim === p5[2] ? 0 : 1;
      totalmotor = (basicmotor === 0 && lim === 1) ? 0 : 1;
    } else if (model === 'SZ40') {
      totalmotor = basicmotor;
    } else {
      throw new Error('Lorenz model type not recognised');
    }

    if (totalmotor === 1) {
      if (--s1 < 1) s1 = 43;
      if (--s2 < 1) s2 = 47;
      if (--s3 < 1) s3 = 51;
      if (--s4 < 1) s4 = 53;
      if (--s5 < 1) s5 = 59;
    }

    m61lug = muSettings[1][m61 - 1];
    m37lug = muSettings[2][m37 - 1];

    let rtnstr = REVERSE_ITA2_TABLE[resultStr];
    if (format === '5/8/9') {
      if (rtnstr === '+') rtnstr = '5';
      if (rtnstr === '-') rtnstr = '8';
      if (rtnstr === '.') rtnstr = '9';
    }
    out += rtnstr;
  }

  return convertFromITA2(out, outtype, mode);
}
