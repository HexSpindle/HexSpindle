import { module } from './_cat.js';
import { A, Html } from '../../core/registry.js';
import { b64Encode, b64Decode } from '../../core/codec.js';
import { decodeLatin1, decodeUtf8 } from '../../core/util.js';

const STD_ALPHABET = 'A-Za-z0-9+/=';
const escapeHtml = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
const b64DecStr = (str, alphabet) => decodeUtf8(b64Decode(str, alphabet));

function tip(text, inner) {
  return `<span title="${escapeHtml(text)}">${inner}</span>`;
}

module('Show Base64 offsets', 'When a string is within a block of data and the whole block is Base64\'d, the string itself could be represented in Base64 in three distinct ways depending on its offset within the block. This operation shows all possible offsets for a given string so that each possible encoding can be considered.',
  [A.string('Alphabet', STD_ALPHABET), A.boolean('Show variable chars and padding', true), A.select('Input format', ['Raw', 'Base64'])],
  (data, alphabet, showVariable, format) => {
    if (format === 'Base64') data = b64Decode(decodeLatin1(data), STD_ALPHABET);
    if (data.length < 1) throw new Error('Please enter a string.');

    const prepend = (n) => { const out = new Uint8Array(n + data.length); out.set(data, n); return out; };

    let offset0 = b64Encode(data, alphabet);
    let offset1 = b64Encode(prepend(1), alphabet);
    let offset2 = b64Encode(prepend(2), alphabet);

    const len0 = offset0.indexOf('='), len1 = offset1.indexOf('='), len2 = offset2.indexOf('=');
    let staticSection;

    if (len0 % 4 === 2) {
      staticSection = offset0.slice(0, -3);
      offset0 = tip(b64DecStr(staticSection, alphabet).slice(0, -2), escapeHtml(staticSection)) +
        `<span class="hl5">${escapeHtml(offset0.slice(-3, -2))}</span>` +
        `<span class="hl3">${escapeHtml(offset0.slice(-2))}</span>`;
    } else if (len0 % 4 === 3) {
      staticSection = offset0.slice(0, -2);
      offset0 = tip(b64DecStr(staticSection, alphabet).slice(0, -1), escapeHtml(staticSection)) +
        `<span class="hl5">${escapeHtml(offset0.slice(-2, -1))}</span>` +
        `<span class="hl3">${escapeHtml(offset0.slice(-1))}</span>`;
    } else {
      staticSection = offset0;
      offset0 = tip(b64DecStr(staticSection, alphabet), escapeHtml(staticSection));
    }
    if (!showVariable) offset0 = escapeHtml(staticSection);

    let padding = `<span class="hl3">${escapeHtml(offset1.slice(0, 1))}</span><span class="hl5">${escapeHtml(offset1.slice(1, 2))}</span>`;
    offset1 = offset1.slice(2);
    if (len1 % 4 === 2) {
      staticSection = offset1.slice(0, -3);
      offset1 = padding + tip(b64DecStr('AA' + staticSection, alphabet).slice(1, -2), escapeHtml(staticSection)) +
        `<span class="hl5">${escapeHtml(offset1.slice(-3, -2))}</span>` +
        `<span class="hl3">${escapeHtml(offset1.slice(-2))}</span>`;
    } else if (len1 % 4 === 3) {
      staticSection = offset1.slice(0, -2);
      offset1 = padding + tip(b64DecStr('AA' + staticSection, alphabet).slice(1, -1), escapeHtml(staticSection)) +
        `<span class="hl5">${escapeHtml(offset1.slice(-2, -1))}</span>` +
        `<span class="hl3">${escapeHtml(offset1.slice(-1))}</span>`;
    } else {
      staticSection = offset1;
      offset1 = padding + tip(b64DecStr('AA' + staticSection, alphabet).slice(1), escapeHtml(staticSection));
    }
    if (!showVariable) offset1 = escapeHtml(staticSection);

    padding = `<span class="hl3">${escapeHtml(offset2.slice(0, 2))}</span><span class="hl5">${escapeHtml(offset2.slice(2, 3))}</span>`;
    offset2 = offset2.slice(3);
    if (len2 % 4 === 2) {
      staticSection = offset2.slice(0, -3);
      offset2 = padding + tip(b64DecStr('AAA' + staticSection, alphabet).slice(2, -2), escapeHtml(staticSection)) +
        `<span class="hl5">${escapeHtml(offset2.slice(-3, -2))}</span>` +
        `<span class="hl3">${escapeHtml(offset2.slice(-2))}</span>`;
    } else if (len2 % 4 === 3) {
      staticSection = offset2.slice(0, -2);
      offset2 = padding + tip(b64DecStr('AAA' + staticSection, alphabet).slice(2, -2), escapeHtml(staticSection)) +
        `<span class="hl5">${escapeHtml(offset2.slice(-2, -1))}</span>` +
        `<span class="hl3">${escapeHtml(offset2.slice(-1))}</span>`;
    } else {
      staticSection = offset2;
      offset2 = padding + tip(b64DecStr('AAA' + staticSection, alphabet).slice(2), escapeHtml(staticSection));
    }
    if (!showVariable) offset2 = escapeHtml(staticSection);

    const style = '<style>.hl5{background:#154a35;color:#7dffc0}.hl3{background:#5c1f2a;color:#ff8a9b}</style>';
    if (!showVariable) return new Html(style + `<pre style="margin:0">${offset0}\n${offset1}\n${offset2}</pre>`);

    return new Html(style +
      `<div style="margin-bottom:8px">Characters highlighted in <span class="hl5">green</span> could change if the input is surrounded by more data.<br>` +
      `Characters highlighted in <span class="hl3">red</span> are for padding purposes only.<br>` +
      `Unhighlighted characters are <span title="Tooltip on left">static</span>.<br>` +
      `Hover over the static sections to see what they decode to on their own.</div>` +
      `<pre style="margin:0">Offset 0: ${offset0}\nOffset 1: ${offset1}\nOffset 2: ${offset2}</pre>`);
  });
