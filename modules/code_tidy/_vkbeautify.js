/*!
 * Portions derived from vkBeautify.
 * Copyright (c) 2012 Vadim Kiryukhin.
 * License: MIT
 *
 * Adapted for HexSpindle.
 * Full license and attribution notices: /THIRD_PARTY_NOTICES.md
 */

export function createShiftArr(step) {
  let space = '    ';
  if (isNaN(parseInt(step))) space = step;
  else if (step >= 1 && step <= 12 && Number.isInteger(step)) space = ' '.repeat(step);
  const shift = ['\n'];
  for (let ix = 0; ix < 100; ix++) shift.push(shift[ix] + space);
  return shift;
}

export function css(text, step) {
  const ar = text.replace(/\s{1,}/g, ' ')
    .replace(/\{/g, '{~::~')
    .replace(/\}/g, '~::~}~::~')
    .replace(/;/g, ';~::~')
    .replace(/\/\*/g, '~::~/*')
    .replace(/\*\//g, '*/~::~')
    .replace(/~::~\s{0,}~::~/g, '~::~')
    .split('~::~');
  const shift = createShiftArr(step || '    ');
  let deep = 0, str = '';
  for (const part of ar) {
    if (/\{/.exec(part)) str += shift[deep++] + part;
    else if (/\}/.exec(part)) str += shift[--deep] + part;
    else str += shift[deep] + part;
  }
  return str.replace(/^\n{1,}/, '');
}

export function cssmin(text, preserveComments) {
  const str = preserveComments ? text : text.replace(/\/\*([^*]|[\r\n]|(\*+([^*/]|[\r\n])))*\*+\//g, '');
  return str.replace(/\s{1,}/g, ' ')
    .replace(/\{\s{1,}/g, '{')
    .replace(/\}\s{1,}/g, '}')
    .replace(/;\s{1,}/g, ';')
    .replace(/\/\*\s{1,}/g, '/*')
    .replace(/\*\/\s{1,}/g, '*/');
}

export function sqlmin(text) {
  return text.replace(/\s{1,}/g, ' ').replace(/\s{1,}\(/, '(').replace(/\s{1,}\)/, ')');
}
