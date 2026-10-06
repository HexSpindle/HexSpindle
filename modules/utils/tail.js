import { module } from './_cat.js';
import { A } from '../../core/registry.js';
import { delim } from '../../core/util.js';

const OPTIONS = ['Line feed', 'CRLF', 'Space', 'Comma', 'Semi-colon', 'Colon', 'Nothing (separate chars)'];

module('Tail',
  'Keeps the last N lines or fields using the selected delimiter. Enable Reverse to remove the last N instead. ' +
  'For negative N, normal mode removes the first |N|, while Reverse keeps only the first |N|.',
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
    // A negative count means "all but the first |N|" in normal mode.
    const start = Math.max(0, Math.min(parts.length,
      count >= 0 ? parts.length - count : -count));
    return (reverse ? parts.slice(0, start) : parts.slice(start)).join(delimiter);
  }, { text: true });
