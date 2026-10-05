import { module } from './_cat.js';
import { A } from '../../core/registry.js';

const L = {"a":"4","e":"3","i":"1","o":"0","s":"5","t":"7"};
const R = {"0":"o","1":"i","3":"e","4":"a","5":"s","7":"t"};

module('Convert Leet Speak', 'Converts text to or from leet speak.', [A.select('Direction', ['To Leet Speak', 'From Leet Speak'])],
  (t, d) => d.startsWith('To')
    ? t.replace(/[a-z]/gi, c => { const l = L[c.toLowerCase()] || c; return c === c.toUpperCase() ? l.toUpperCase() : l; })
    : t.replace(/[48cd3f6h1jklmn0pqr57uvwxyz]/gi, c => R[c] || c), { text: true });
