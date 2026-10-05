import { module } from './_cat.js';
import { A } from '../../core/registry.js';

module('Normalise Unicode', 'Normalises text to NFC, NFD, NFKC or NFKD.', [A.select('Normal Form', ['NFD', 'NFC', 'NFKD', 'NFKC'])],
  (t, form) => t.normalize(form), { text: true });
