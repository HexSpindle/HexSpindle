import { module } from './_cat.js';
import { A } from '../../core/registry.js';
import { delim } from '../../core/util.js';

const OPTIONS = ['Line feed', 'CRLF', 'Space', 'Comma', 'Semi-colon', 'Colon', 'Nothing (separate chars)'];

module('Head',
  'Keeps the first N lines or fields using the selected delimiter. Enable Reverse to remove the first N instead. ' +
  'For negative N, normal mode removes the last |N|, while Reverse keeps only the last |N|.',
  [
    A.number('Number', 10),
    A.select('Delimiter', OPTIONS, 'Line feed'),
    A.boolean('Reverse', false),
  ],
  (text, n = 10, separator = 'Line feed', reverse = false) => {
    const delimiter = delim(separator);
    const parts = delimiter === '' ? Array.from(text) : text.split(delimiter);
    const count = Math.trunc(Number(n));
    if (!Number.isFinite(count)) throw new Error('Number must be finite');
    // A negative count means "all but the last |N|" in normal mode.
    const kept = Math.max(0, Math.min(parts.length,
      count >= 0 ? count : parts.length + count));
    return (reverse ? parts.slice(kept) : parts.slice(0, kept)).join(delimiter);
  }, { text: true });
