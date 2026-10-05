import { module } from './_cat.js';

const NATO = { A: 'Alfa', B: 'Bravo', C: 'Charlie', D: 'Delta', E: 'Echo', F: 'Foxtrot', G: 'Golf', H: 'Hotel', I: 'India', J: 'Juliett',
  K: 'Kilo', L: 'Lima', M: 'Mike', N: 'November', O: 'Oscar', P: 'Papa', Q: 'Quebec', R: 'Romeo', S: 'Sierra', T: 'Tango',
  U: 'Uniform', V: 'Victor', W: 'Whiskey', X: 'X-ray', Y: 'Yankee', Z: 'Zulu', 0: 'Zero', 1: 'One', 2: 'Two', 3: 'Three',
  4: 'Four', 5: 'Five', 6: 'Six', 7: 'Seven', 8: 'Eight', 9: 'Nine' };

const EXTRA = { ',': 'Comma', '/': 'Fraction bar', '.': 'Full stop' };

module('Convert to NATO alphabet', 'Spells out each letter/digit using the NATO phonetic alphabet.', [],
  (t) => t.replace(/[a-z0-9,/.]/gi, c => (NATO[c.toUpperCase()] ?? EXTRA[c]) + ' '), { text: true });
