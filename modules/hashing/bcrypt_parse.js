import { module } from './_cat.js';

module('Bcrypt parse', 'Splits a bcrypt hash into version, cost, salt and digest.',
  [],
  (t) => {
    t = t.trim();
    const p = t.split('$');
    if (p.length !== 4 || p[3].length !== 53) throw new Error('Not a bcrypt hash');
    const rounds = parseInt(p[2], 10);
    return `Version: $${p[1]}$\nRounds: ${rounds} (2^${rounds} iterations)\nSalt: ${p[3].slice(0, 22)}\nHash: ${p[3].slice(22)}`;
  }, { text: true });
