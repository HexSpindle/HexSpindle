import { module } from './_cat.js';
import { A } from '../../core/registry.js';
import { VALID_ITA2 } from './_lorenz.js';
import { ColossusComputer } from './_colossus.js';

const ROTOR_NAMES = ['', 'X1', 'X2', 'X3', 'X4', 'X5', 'M37', 'M61', 'S1', 'S2', 'S3', 'S4', 'S5'];
const SWITCH_RE = /^$|^[.x]$/;

function readSwitch(v, label) {
  v = (v || '').trim();
  if (!SWITCH_RE.test(v)) throw new Error(`Switch ${label} can only be set to blank, . or x`);
  return v;
}

module('Colossus',
  'Emulates the Colossus computer used at Bletchley Park to attack the Lorenz SZ40/42 cipher by ' +
  'statistically scoring wheel settings (e.g. "de-chi"/delta-Z counts), not by fully automating a ' +
  'break. Input is ITA2 ciphertext (as used by Lorenz/Colossus). The Q-bus selects which signal(s) ' +
  '(Z, Chi, Psi, or their deltas) are combined onto the bus; the K Rack conditional rows (R1-R3) ' +
  'and addition row count matching patterns into one of 5 counters as Colossus steps the chosen ' +
  '"Fast"/"Slow" wheel(s) through every relative setting.',
  [
    A.select('Pattern', ['KH Pattern', 'ZMUG Pattern', 'BREAM Pattern']),
    A.select('Q-bus Z', ['', 'Z', 'ΔZ']),
    A.select('Q-bus Chi (Χ)', ['', 'Χ', 'ΔΧ']),
    A.select('Q-bus Psi (Ψ)', ['', 'Ψ', 'ΔΨ']),
    A.select('Limitation', ['None', 'Χ2', 'Χ2 + P5', 'X2 + Ψ1', 'X2 + Ψ1 + P5']),

    A.string('R1-Q1', ''), A.string('R1-Q2', ''), A.string('R1-Q3', ''), A.string('R1-Q4', ''), A.string('R1-Q5', ''),
    A.boolean('R1-Negate', false), A.select('R1-Counter', ['', '1', '2', '3', '4', '5']),

    A.string('R2-Q1', ''), A.string('R2-Q2', ''), A.string('R2-Q3', ''), A.string('R2-Q4', ''), A.string('R2-Q5', ''),
    A.boolean('R2-Negate', false), A.select('R2-Counter', ['', '1', '2', '3', '4', '5']),

    A.string('R3-Q1', ''), A.string('R3-Q2', ''), A.string('R3-Q3', ''), A.string('R3-Q4', ''), A.string('R3-Q5', ''),
    A.boolean('R3-Negate', false), A.select('R3-Counter', ['', '1', '2', '3', '4', '5']),

    A.boolean('Negate All', false),

    A.boolean('Add-Q1', false), A.boolean('Add-Q2', false), A.boolean('Add-Q3', false), A.boolean('Add-Q4', false), A.boolean('Add-Q5', false),
    A.string('Add-Equals', ''), A.boolean('Add-Counter1', false), A.boolean('Add Negate All', false),
    A.string('Total Motor', ''),

    A.number('Set Total', 0, 0, 9999),
    A.select('Fast Step', ROTOR_NAMES),
    A.select('Slow Step', ROTOR_NAMES),

    A.number('Start Χ1', 1, 1, 41), A.number('Start Χ2', 1, 1, 31), A.number('Start Χ3', 1, 1, 29),
    A.number('Start Χ4', 1, 1, 26), A.number('Start Χ5', 1, 1, 23),
    A.number('Start M61', 1, 1, 61), A.number('Start M37', 1, 1, 37),
    A.number('Start Ψ1', 1, 1, 43), A.number('Start Ψ2', 1, 1, 47), A.number('Start Ψ3', 1, 1, 51),
    A.number('Start Ψ4', 1, 1, 53), A.number('Start Ψ5', 1, 1, 59),
    A.select('Output', ['Data (JSON)', 'Text']),
  ],
  (input, pattern, qz, qchi, qpsi, limitation,
    r1q1, r1q2, r1q3, r1q4, r1q5, r1neg, r1ctr,
    r2q1, r2q2, r2q3, r2q4, r2q5, r2neg, r2ctr,
    r3q1, r3q2, r3q3, r3q4, r3q5, r3neg, r3ctr,
    negateAll,
    aq1, aq2, aq3, aq4, aq5, aEquals, aCounter1, addNegateAll, totalMotor,
    setTotal, fastStep, slowStep,
    x1, x2, x3, x4, x5, m61, m37, s1, s2, s3, s4, s5, outFmt = 'Data (JSON)') => {
    input = input.toUpperCase();
    for (const character of input) {
      if (VALID_ITA2.indexOf(character) === -1) {
        let errltr = character;
        if (errltr === '\n') errltr = 'Carriage Return';
        if (errltr === ' ') errltr = 'Space';
        throw new Error(`Invalid ITA2 character : ${errltr}`);
      }
    }

    const qbusin = { Z: qz, Chi: qchi, Psi: qpsi };
    const lm = [limitation.includes('Χ2'), limitation.includes('Ψ1'), limitation.includes('P5')];
    const limit = { X2: lm[0], S1: lm[1], P5: lm[2] };

    const qbusswitches = {
      condition: [
        { Qswitches: [readSwitch(r1q1, 'R1-Q1'), readSwitch(r1q2, 'R1-Q2'), readSwitch(r1q3, 'R1-Q3'), readSwitch(r1q4, 'R1-Q4'), readSwitch(r1q5, 'R1-Q5')], Negate: r1neg, Counter: r1ctr },
        { Qswitches: [readSwitch(r2q1, 'R2-Q1'), readSwitch(r2q2, 'R2-Q2'), readSwitch(r2q3, 'R2-Q3'), readSwitch(r2q4, 'R2-Q4'), readSwitch(r2q5, 'R2-Q5')], Negate: r2neg, Counter: r2ctr },
        { Qswitches: [readSwitch(r3q1, 'R3-Q1'), readSwitch(r3q2, 'R3-Q2'), readSwitch(r3q3, 'R3-Q3'), readSwitch(r3q4, 'R3-Q4'), readSwitch(r3q5, 'R3-Q5')], Negate: r3neg, Counter: r3ctr },
      ],
      condNegateAll: negateAll,
      addition: [
        { Qswitches: [aq1, aq2, aq3, aq4, aq5], Equals: readSwitch(aEquals, 'Add-Equals'), C1: aCounter1 },
      ],
      addNegateAll,
      totalMotor: readSwitch(totalMotor, 'Total Motor'),
    };

    if (setTotal < 0 || setTotal > 9999) throw new Error('Set Total must be between 0000 and 9999');
    const control = { fast: fastStep, slow: slowStep };

    if (x1 < 1 || x1 > 41) throw new Error('Χ1 start must be between 1 and 41');
    if (x2 < 1 || x2 > 31) throw new Error('Χ2 start must be between 1 and 31');
    if (x3 < 1 || x3 > 29) throw new Error('Χ3 start must be between 1 and 29');
    if (x4 < 1 || x4 > 26) throw new Error('Χ4 start must be between 1 and 26');
    if (x5 < 1 || x5 > 23) throw new Error('Χ5 start must be between 1 and 23');
    if (m61 < 1 || m61 > 61) throw new Error('Μ61 start must be between 1 and 61');
    if (m37 < 1 || m37 > 37) throw new Error('Μ37 start must be between 1 and 37');
    if (s1 < 1 || s1 > 43) throw new Error('Ψ1 start must be between 1 and 43');
    if (s2 < 1 || s2 > 47) throw new Error('Ψ2 start must be between 1 and 47');
    if (s3 < 1 || s3 > 51) throw new Error('Ψ3 start must be between 1 and 51');
    if (s4 < 1 || s4 > 53) throw new Error('Ψ4 start must be between 1 and 53');
    if (s5 < 1 || s5 > 59) throw new Error('Ψ5 start must be between 1 and 59');

    const starts = { X1: x1, X2: x2, X3: x3, X4: x4, X5: x5, M61: m61, M37: m37, S1: s1, S2: s2, S3: s3, S4: s4, S5: s5 };

    const colossus = new ColossusComputer(input, pattern, qbusin, qbusswitches, control, starts, setTotal, limit);
    const result = colossus.run();
    if (outFmt !== 'Text') return JSON.stringify(result, null, 4);

    return `${result.printout}\nColossus Counters\nC1  C2  C3  C4  C5\n${result.counters.join('   ')}`;
  }, { text: true });
