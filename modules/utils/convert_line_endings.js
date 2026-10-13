import { module } from './_cat.js';
import { A } from '../../core/registry.js';

const ENDINGS = { 'LF (Unix / macOS)': '\n', 'CRLF (Windows)': '\r\n', 'CR (classic Mac)': '\r' };

module('Convert line endings',
  'Rewrites every line ending (LF, CRLF or CR, including a mix of them) to the one you choose. Useful before hashing or comparing text that passed through different systems.',
  [A.select('Convert to', Object.keys(ENDINGS))],
  (t, to) => t.replace(/\r\n|\n|\r/g, ENDINGS[to] ?? '\n'),
  { text: true, aliases: ['crlf', 'newline', 'newlines', 'eol', 'dos2unix', 'unix2dos', 'normalise line endings', 'normalize line endings'] });
