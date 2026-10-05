import { module } from './_cat.js';
import { A } from '../../core/registry.js';

const WIN_PATH = /[A-Za-z]:\\(?:[^\\\/:*?"<>|\r\n]+\\)*[^\\\/:*?"<>|\r\n\s]*/g;
const UNIX_PATH = /(?<![\w:\/])\/(?:[\w.-]+\/)*[\w.-]+/g;

module('Extract file paths', 'Extracts Windows and/or UNIX file paths.',
  [A.boolean('Windows', true), A.boolean('UNIX', true), A.boolean('Display total', false), A.boolean('Sort', false), A.boolean('Unique', false)],
  (t, win, unix, total, srt, uniq) => {
    let found = (win ? (t.match(WIN_PATH) || []) : []).concat(unix ? (t.match(UNIX_PATH) || []) : []);
    if (uniq) found = [...new Set(found)];
    if (srt) found = [...found].sort();
    const out = found.join('\n');
    return total ? `Total found: ${found.length}\n\n${out}` : out;
  }, { text: true });
