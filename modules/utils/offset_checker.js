import { module } from './_cat.js';
import { A, Html } from '../../core/registry.js';

const HTML_CHARS = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#x27;', '`': '&#x60;', '\u0000': '\ue000' };
const escapeHtml = s => s.replace(/[&<>"'`\u0000]/g, c => HTML_CHARS[c]);

module('Offset checker', 'Compares multiple inputs (separated by the sample delimiter) and highlights the characters that are identical, at the same position, across every sample.',
  [A.string('Sample delimiter', '\\n\\n')],
  (t, sdRaw) => {
    const sampleDelim = sdRaw.replace(/\\n/g, '\n').replace(/\\t/g, '\t').replace(/\\r/g, '\r');
    const samples = t.split(sampleDelim);
    if (samples.length < 2) throw new Error('Not enough samples, perhaps you need to modify the sample delimiter or add more data?');

    const outputs = new Array(samples.length).fill('');
    let inMatch = false;

    for (let i = 0; i < samples[0].length; i++) {
      const chr = samples[0][i];
      let match = false;
      for (let s = 1; s < samples.length; s++) {
        if (samples[s][i] !== chr) { match = false; break; }
        match = true;
      }

      for (let s = 0; s < samples.length; s++) {
        if (samples[s].length <= i) {
          if (inMatch) outputs[s] += '</span>';
          if (s === samples.length - 1) inMatch = false;
          continue;
        }

        if (match && !inMatch) {
          outputs[s] += "<span style=\"background:#154a35;color:#7dffc0\">" + escapeHtml(samples[s][i]);
          if (samples[s].length === i + 1) outputs[s] += '</span>';
          if (s === samples.length - 1) inMatch = true;
        } else if (!match && inMatch) {
          outputs[s] += '</span>' + escapeHtml(samples[s][i]);
          if (s === samples.length - 1) inMatch = false;
        } else {
          outputs[s] += escapeHtml(samples[s][i]);
          if (inMatch && samples[s].length === i + 1) {
            outputs[s] += '</span>';
            if (samples[s].length - 1 !== i) inMatch = false;
          }
        }

        if (samples[0].length - 1 === i) {
          if (inMatch) outputs[s] += '</span>';
          outputs[s] += escapeHtml(samples[s].substring(i + 1));
        }
      }
    }

    return new Html(`<pre style="white-space:pre-wrap;margin:0">${outputs.join(escapeHtml(sampleDelim))}</pre>`);
  }, { text: true });
