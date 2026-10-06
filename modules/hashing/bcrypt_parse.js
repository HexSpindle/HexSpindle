import { module } from './_cat.js';

module('Bcrypt parse', 'Splits a bcrypt hash into its cost (rounds), salt and password hash.',
  [],
  (t) => {
    if (t.length !== 60) throw new Error(`Error: Illegal hash length: ${t.length} != 60`);
    const salt = t.substring(0, 29);
    return `Rounds: ${parseInt(t.split('$')[2], 10)}
Salt: ${salt}
Password hash: ${t.split(salt)[1]}
Full hash: ${t}`;
  }, { text: true });
