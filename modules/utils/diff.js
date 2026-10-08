import { module } from './_cat.js';
import { A, Html } from '../../core/registry.js';

// Load jsdiff only when the Diff operation is executed.
let jsdiffPromise;
function loadJsdiff() {
  if (!jsdiffPromise) {
    jsdiffPromise = import('./_jsdiff.js').catch(error => {
      jsdiffPromise = null;
      throw error;
    });
  }
  return jsdiffPromise;
}

const HTML_CHARS = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#x27;', '`': '&#x60;', '\u0000': '' };
const escapeHtml = s => s.replace(/[&<>"'`\u0000]/g, c => HTML_CHARS[c]);

module('Diff', 'Compares two samples (separated by the sample delimiter) and shows additions/removals.',
  [A.string('Sample delimiter', '\\n\\n'), A.select('Diff by', ['Character', 'Word', 'Line', 'Sentence', 'CSS', 'JSON']),
   A.boolean('Show added', true), A.boolean('Show removed', true), A.boolean('Show subtraction', false), A.boolean('Ignore whitespace', false)],
  async (t, sd, by, added, removed, subtraction, ignoreWs) => {
    sd = sd.replace(/\\n/g, '\n').replace(/\\t/g, '\t').replace(/\\r/g, '\r');
    const samples = t.split(sd);
    if (samples.length !== 2) throw new Error('Incorrect number of samples, perhaps you need to modify the sample delimiter or add more samples?');
    const [a, b] = samples;
    const { diffChars, diffWords, diffWordsWithSpace, diffLines, diffTrimmedLines, diffSentences, diffCss, diffJson } = await loadJsdiff();
    let diff;
    switch (by) {
      case 'Character': diff = diffChars(a, b); break;
      case 'Word': diff = ignoreWs ? diffWords(a, b) : diffWordsWithSpace(a, b); break;
      case 'Line': diff = ignoreWs ? diffTrimmedLines(a, b) : diffLines(a, b); break;
      case 'Sentence': diff = diffSentences(a, b); break;
      case 'CSS': diff = diffCss(a, b); break;
      case 'JSON': diff = diffJson(a, b); break;
      default: throw new Error("Invalid 'Diff by' option.");
    }
    let out = '';
    for (const part of diff) {
      if (part.added) { if (added) out += `<ins style="background:#154a35;color:#7dffc0;text-decoration:none">${escapeHtml(part.value)}</ins>`; }
      else if (part.removed) { if (removed) out += `<del style="background:#5c1f2a;color:#ff8a9b;text-decoration:none">${escapeHtml(part.value)}</del>`; }
      else if (!subtraction) out += escapeHtml(part.value);
    }
    return new Html(`<pre style="white-space:pre-wrap;margin:0">${out}</pre>`);
  }, { text: true });
