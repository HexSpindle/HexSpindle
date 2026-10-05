import { module } from './_cat.js';
import { expandAlphabet } from '../../core/codec.js';

module('Expand alphabet range', 'Expands range notation (e.g. a-z0-9) into the full character sequence.',
  [], (t) => expandAlphabet(t.trim()), { text: true });
