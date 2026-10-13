// Magic hints for hashing operations. A hash cannot be decoded, but its type can usually be narrowed down.
import { analyses, HASH_LENGTHS } from '../../core/magic-detect.js';

analyses('Analyse hash', ({ ascii, single, compact }) => {
  if (!ascii || !single) return null;
  if (/^[0-9a-f]+$/i.test(compact) && HASH_LENGTHS[compact.length]) return 0.9;
  return /^\$(?:2[aby]|argon2\w*|5|6|1|y)\$/.test(compact) ? 0.7 : null;
});
