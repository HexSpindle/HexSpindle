import { module } from './_cat.js';
import { A } from '../../core/registry.js';
import { bcryptCrypt, bcryptEncode, bcryptDecode } from './bcrypt.js';

function bcryptRehash(password, hash) {
  if (hash.charAt(0) !== '$' || hash.charAt(1) !== '2') throw new Error('Error: Invalid salt version: ' + hash.substring(0, 2));
  let minor = '', offset = 3;
  if (hash.charAt(2) !== '$') {
    minor = hash.charAt(2);
    if ((minor !== 'a' && minor !== 'b' && minor !== 'y') || hash.charAt(3) !== '$') throw new Error('Error: Invalid salt revision: ' + hash.substring(2, 4));
    offset = 4;
  }
  if (hash.charAt(offset + 2) > '$') throw new Error('Error: Missing salt rounds');
  const rounds = parseInt(hash.substring(offset, offset + 1), 10) * 10 + parseInt(hash.substring(offset + 1, offset + 2), 10);
  if (!(rounds >= 4 && rounds <= 31)) throw new Error('Error: Illegal number of rounds (4-31): ' + rounds);
  const salt = bcryptDecode(hash.substring(offset + 3, offset + 25), 16);
  const pw = minor ? new Uint8Array([...password, 0]) : password;
  const ct = bcryptCrypt(pw, salt, rounds);
  return `$2${minor}$${String(rounds).padStart(2, '0')}$${bcryptEncode(salt)}${bcryptEncode(ct.subarray(0, 23))}`;
}

module('Bcrypt compare', 'Checks whether the input matches a bcrypt hash.', [A.string('Hash', '')],
  (data, h) => {
    if (h.length !== 60) return 'No match';
    const match = bcryptRehash(data, h) === h;
    return match ? 'Match: ' + new TextDecoder().decode(data) : 'No match';
  });
