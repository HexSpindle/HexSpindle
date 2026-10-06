import { module } from './_cat.js';
import { A } from '../../core/registry.js';

function shiftArr(step) {
  let space = '    ';
  // vkbeautify's switch compares the (string) argument with numbers, so a numeric indent string
  // always ends up as the four-space default.
  if (isNaN(parseInt(step, 10))) space = step;
  const shift = ['\n'];
  for (let i = 0; i < 100; i++) shift.push(shift[i] + space);
  return shift;
}

export function vkXml(text, step) {
  const ar = text.replace(/>\s{0,}</g, '><')
    .replace(/</g, '~::~<')
    .replace(/\s*xmlns:/g, '~::~xmlns:')
    .replace(/\s*xmlns=/g, '~::~xmlns=')
    .split('~::~');
  const shift = shiftArr(step || '    ');
  const sh = (d) => shift[d] ?? (d < 0 ? '' : shift[shift.length - 1]);
  let inComment = false, deep = 0, str = '';
  for (let ix = 0; ix < ar.length; ix++) {
    const s = ar[ix];
    if (s.search(/<!/) > -1) {
      str += sh(deep) + s;
      inComment = true;
      if (s.search(/-->/) > -1 || s.search(/\]>/) > -1 || s.search(/!DOCTYPE/) > -1) inComment = false;
    } else if (s.search(/-->/) > -1 || s.search(/\]>/) > -1) {
      str += s;
      inComment = false;
    } else if (/^<\w/.exec(ar[ix - 1]) && /^<\/\w/.exec(s) &&
      // Loose (==) comparison of a match array with a string, exactly as vkbeautify does.
      String(/^<[\w:\-.,]+/.exec(ar[ix - 1])) === /^<\/[\w:\-.,]+/.exec(s)[0].replace('/', '')) {
      str += s;
      if (!inComment) deep--;
    } else if (s.search(/<\w/) > -1 && s.search(/<\//) === -1 && s.search(/\/>/) === -1) {
      str += !inComment ? sh(deep++) + s : s;
    } else if (s.search(/<\w/) > -1 && s.search(/<\//) > -1) {
      str += !inComment ? sh(deep) + s : s;
    } else if (s.search(/<\//) > -1) {
      str += !inComment ? sh(--deep) + s : s;
    } else if (s.search(/\/>/) > -1) {
      str += !inComment ? sh(deep) + s : s;
    } else if (s.search(/<\?/) > -1) {
      str += sh(deep) + s;
    } else if (s.search(/xmlns:/) > -1 || s.search(/xmlns=/) > -1) {
      str += sh(deep) + s;
    } else {
      str += s;
    }
  }
  return str[0] === '\n' ? str.slice(1) : str;
}

module('XML Beautify', 'Indents and formats XML (vkbeautify layout).', [A.string('Indent string', '\\t')],
  (t, indent) => vkXml(t, indent.replace(/\\t/g, '\t')),
  { text: true }
);
