import { ITA2_TABLE, ROTOR_SIZES, INIT_PATTERNS } from './_lorenz.js';

function bits(str) { return [...str].map(Number); }

export class ColossusComputer {
  constructor(ciphertext, pattern, qbusin, qbusswitches, control, starts, settotal, limit) {
    this.ciphertext = ciphertext;
    this.qbusin = qbusin;
    this.qbusswitches = qbusswitches;
    this.control = control;
    this.starts = starts;
    this.settotal = settotal;
    this.limitations = limit;

    this.allCounters = [0, 0, 0, 0, 0];
    this.Zbits = [0, 0, 0, 0, 0];
    this.ZbitsOneBack = [0, 0, 0, 0, 0];
    this.Qbits = [0, 0, 0, 0, 0];
    this.Xbits = [0, 0, 0, 0, 0];
    this.Xptr = [0, 0, 0, 0, 0];
    this.XbitsOneBack = [0, 0, 0, 0, 0];
    this.Sbits = [0, 0, 0, 0, 0];
    this.Sptr = [0, 0, 0, 0, 0];
    this.SbitsOneBack = [0, 0, 0, 0, 0];
    this.Mptr = [0, 0];
    this.rotorPtrs = {};
    this.totalmotor = 0;
    this.P5Zbit = [0, 0];

    this.rings = {
      X: {
        1: INIT_PATTERNS[pattern].X[1].slice().reverse(),
        2: INIT_PATTERNS[pattern].X[2].slice().reverse(),
        3: INIT_PATTERNS[pattern].X[3].slice().reverse(),
        4: INIT_PATTERNS[pattern].X[4].slice().reverse(),
        5: INIT_PATTERNS[pattern].X[5].slice().reverse(),
      },
      M: {
        1: INIT_PATTERNS[pattern].M[1].slice().reverse(),
        2: INIT_PATTERNS[pattern].M[2].slice().reverse(),
      },
      S: {
        1: INIT_PATTERNS[pattern].S[1].slice().reverse(),
        2: INIT_PATTERNS[pattern].S[2].slice().reverse(),
        3: INIT_PATTERNS[pattern].S[3].slice().reverse(),
        4: INIT_PATTERNS[pattern].S[4].slice().reverse(),
        5: INIT_PATTERNS[pattern].S[5].slice().reverse(),
      },
    };
  }

  run() {
    const result = { printout: '' };
    this.rotorPtrs = { X1: this.starts.X1, X2: this.starts.X2, X3: this.starts.X3, X4: this.starts.X4, X5: this.starts.X5, M61: this.starts.M61, M37: this.starts.M37, S1: this.starts.S1, S2: this.starts.S2, S3: this.starts.S3, S4: this.starts.S4, S5: this.starts.S5 };
    let runcount = 1;
    const fast = this.control.fast;
    const slow = this.control.slow;
    result.printout += fast + ' ' + slow + '\n';

    do {
      this.allCounters = [0, 0, 0, 0, 0];
      this.ZbitsOneBack = [0, 0, 0, 0, 0];
      this.XbitsOneBack = [0, 0, 0, 0, 0];

      this.runTape();

      let fastRef = '00', slowRef = '00';
      if (fast !== '') fastRef = this.rotorPtrs[fast].toString().padStart(2, '0');
      if (slow !== '') slowRef = this.rotorPtrs[slow].toString().padStart(2, '0');
      let printline = '';
      for (let c = 0; c < 5; c++) {
        if (this.allCounters[c] > this.settotal) printline += String.fromCharCode(c + 97) + this.allCounters[c] + ' ';
      }
      if (printline !== '') result.printout += fastRef + ' ' + slowRef + ' : ' + printline + '\n';

      if (fast !== '') {
        this.rotorPtrs[fast]++;
        if (this.rotorPtrs[fast] > ROTOR_SIZES[fast]) this.rotorPtrs[fast] = 1;
      }
      if (slow !== '' && this.rotorPtrs[fast] === this.starts[fast]) {
        this.rotorPtrs[slow]++;
        if (this.rotorPtrs[slow] > ROTOR_SIZES[slow]) this.rotorPtrs[slow] = 1;
      }
      runcount++;
    } while (JSON.stringify(this.rotorPtrs) !== JSON.stringify(this.starts));

    result.counters = this.allCounters;
    result.runcount = runcount;
    return result;
  }

  runTape() {
    this.Xptr = [this.rotorPtrs.X1, this.rotorPtrs.X2, this.rotorPtrs.X3, this.rotorPtrs.X4, this.rotorPtrs.X5];
    this.Mptr = [this.rotorPtrs.M37, this.rotorPtrs.M61];
    this.Sptr = [this.rotorPtrs.S1, this.rotorPtrs.S2, this.rotorPtrs.S3, this.rotorPtrs.S4, this.rotorPtrs.S5];

    for (let i = 0; i < this.ciphertext.length; i++) {
      const charZin = this.ciphertext.charAt(i);
      this.getQbusInputs(charZin);
      const tmpcnt = this.runQbusProcessingConditional();
      this.runQbusProcessingAddition(tmpcnt);
      this.P5Zbit[1] = this.P5Zbit[0];
      this.P5Zbit[0] = bits(ITA2_TABLE[charZin])[4];
      this.stepThyratrons();
    }
  }

  stepThyratrons() {
    let X2bPtr = this.Xptr[1] - 1;
    if (X2bPtr === 0) X2bPtr = ROTOR_SIZES.X2;
    let S1bPtr = this.Sptr[0] - 1;
    if (S1bPtr === 0) S1bPtr = ROTOR_SIZES.S1;

    let X5bPtr = this.Xptr[4] - 1;
    if (X5bPtr === 0) X5bPtr = ROTOR_SIZES.X5;
    X5bPtr = X5bPtr - 1;
    if (X5bPtr === 0) X5bPtr = ROTOR_SIZES.X5;
    let S5bPtr = this.Sptr[4] - 1;
    if (S5bPtr === 0) S5bPtr = ROTOR_SIZES.S5;
    S5bPtr = S5bPtr - 1;
    if (S5bPtr === 0) S5bPtr = ROTOR_SIZES.S5;

    const x2sw = this.limitations.X2;
    const s1sw = this.limitations.S1;
    const p5sw = this.limitations.P5;

    let lim = 1;
    if (x2sw) lim = this.rings.X[2][X2bPtr - 1];
    if (s1sw) lim = lim ^ this.rings.S[1][S1bPtr - 1];

    if (p5sw) {
      let p5lim = this.P5Zbit[1];
      p5lim = p5lim ^ this.rings.X[5][X5bPtr - 1];
      p5lim = p5lim ^ this.rings.S[5][S5bPtr - 1];
      lim = lim ^ p5lim;
    }

    const basicmotor = this.rings.M[2][this.Mptr[0] - 1];
    this.totalmotor = basicmotor;

    if (x2sw || s1sw) {
      this.totalmotor = (basicmotor === 0 && lim === 1) ? 0 : 1;
    }

    for (let r = 0; r < 5; r++) {
      this.Xptr[r]++;
      if (this.Xptr[r] > ROTOR_SIZES['X' + (r + 1)]) this.Xptr[r] = 1;
    }

    if (this.totalmotor) {
      for (let r = 0; r < 5; r++) {
        this.Sptr[r]++;
        if (this.Sptr[r] > ROTOR_SIZES['S' + (r + 1)]) this.Sptr[r] = 1;
      }
    }

    if (this.rings.M[1][this.Mptr[1] - 1] === 1) this.Mptr[0]++;
    if (this.Mptr[0] > ROTOR_SIZES.M37) this.Mptr[0] = 1;

    this.Mptr[1]++;
    if (this.Mptr[1] > ROTOR_SIZES.M61) this.Mptr[1] = 1;
  }

  getQbusInputs(charZin) {
    this.Zbits = bits(ITA2_TABLE[charZin]);
    if (this.qbusin.Z === 'Z') {
      this.Qbits = this.Zbits.slice();
    } else if (this.qbusin.Z === 'ΔZ') {
      for (let b = 0; b < 5; b++) this.Qbits[b] = this.Zbits[b] ^ this.ZbitsOneBack[b];
    }
    this.ZbitsOneBack = this.Zbits.slice();

    for (let b = 0; b < 5; b++) this.Xbits[b] = this.rings.X[b + 1][this.Xptr[b] - 1];
    if (this.qbusin.Chi !== '') {
      if (this.qbusin.Chi === 'Χ') {
        for (let b = 0; b < 5; b++) this.Qbits[b] = this.Qbits[b] ^ this.Xbits[b];
      } else if (this.qbusin.Chi === 'ΔΧ') {
        for (let b = 0; b < 5; b++) { this.Qbits[b] = this.Qbits[b] ^ this.Xbits[b]; this.Qbits[b] = this.Qbits[b] ^ this.XbitsOneBack[b]; }
      }
    }
    this.XbitsOneBack = this.Xbits.slice();

    for (let b = 0; b < 5; b++) this.Sbits[b] = this.rings.S[b + 1][this.Sptr[b] - 1];
    if (this.qbusin.Psi !== '') {
      if (this.qbusin.Psi === 'Ψ') {
        for (let b = 0; b < 5; b++) this.Qbits[b] = this.Qbits[b] ^ this.Sbits[b];
      } else if (this.qbusin.Psi === 'ΔΨ') {
        for (let b = 0; b < 5; b++) { this.Qbits[b] = this.Qbits[b] ^ this.Sbits[b]; this.Qbits[b] = this.Qbits[b] ^ this.SbitsOneBack[b]; }
      }
    }
    this.SbitsOneBack = this.Sbits.slice();
  }

  runQbusProcessingConditional() {
    const cnt = [-1, -1, -1, -1, -1];
    const numrows = this.qbusswitches.condition.length;
    for (let r = 0; r < numrows; r++) {
      const row = this.qbusswitches.condition[r];
      if (row.Counter !== '') {
        let result = true;
        const cPnt = row.Counter - 1;
        const Qswitch = this.readBusSwitches(row.Qswitches);
        for (let s = 0; s < 5; s++) if (Qswitch[s] >= 0 && Qswitch[s] !== this.Qbits[s]) result = false;
        if (row.Negate) result = !result;
        if (cnt[cPnt] === -1) cnt[cPnt] = result;
        else if (!result) cnt[cPnt] = false;
      }
    }
    for (let c = 0; c < 5; c++) if (this.qbusswitches.condNegateAll && cnt[c] !== -1) cnt[c] = !cnt[c];
    return cnt;
  }

  runQbusProcessingAddition(cnt) {
    const row = this.qbusswitches.addition[0];
    const Qswitch = row.Qswitches.slice();
    if (row.C1) {
      let addition = 0;
      for (let s = 0; s < 5; s++) if (Qswitch[s]) addition = addition ^ this.Qbits[s];
      const equals = row.Equals === '' ? -1 : (row.Equals === '.' ? 0 : 1);
      if (addition === equals) { if (cnt[0] === -1) cnt[0] = true; } else cnt[0] = false;
    }
    for (let c = 0; c < 5; c++) {
      if (this.qbusswitches.addNegateAll && cnt[c] !== -1) cnt[c] = !cnt[c];
      if (this.qbusswitches.totalMotor === '' || (this.qbusswitches.totalMotor === 'x' && this.totalmotor === 0) || (this.qbusswitches.totalMotor === '.' && this.totalmotor === 1)) {
        if (cnt[c] === true) this.allCounters[c]++;
      }
    }
  }

  readBusSwitches(row) {
    const output = [-1, -1, -1, -1, -1];
    for (let c = 0; c < 5; c++) {
      if (row[c] === '.') output[c] = 0;
      if (row[c] === 'x') output[c] = 1;
    }
    return output;
  }
}
