// Shared helpers for Magic detection hints (see core/magic.js for how hints are used).
import { magicHint } from './registry.js';

const DELIMITER_NAMES = { ' ': 'Space', ',': 'Comma', ';': 'Semi-colon', ':': 'Colon', '\n': 'Line feed', '\r\n': 'CRLF', '\t': 'Tab' };

// Names the single delimiter separating numeric tokens, or null when delimiters are mixed.
export function delimiterOf(t) {
  const runs = t.match(/[^0-9a-zA-Z]+/g);
  if (!runs) return null;
  const first = runs[0];
  if (runs.every(r => r === first) && DELIMITER_NAMES[first]) return DELIMITER_NAMES[first];
  return runs.every(r => /^[ \t\r\n]+$/.test(r)) ? 'Space' : null;
}

export const numericTokens = t => t.split(/[\s,;:]+/).filter(Boolean);

// A hint that turns the data into something else: Magic runs the operation and follows the result.
//   detect(ctx) returns nothing, a fit between 0 and 1, { fit, args, label, ... }, or an array of those.
export const decodes = (name, detect) => magicHint(name, { kind: 'decode', detect });

// A hint for an operation that reports on the data instead of decoding it: Magic suggests it, but does not run it.
export const analyses = (name, detect) => magicHint(name, { kind: 'analyse', detect });

// An operation that would apply, but only with a key or passphrase Magic cannot know.
export const needsKey = (name, what, detect) => magicHint(name, { kind: 'analyse', requires: what, detect });

// Checks for results that are known to be plain text.
export const printableAscii = bytes => bytes.length > 0 && bytes.every(b => (b >= 32 && b < 127) || b === 9 || b === 10 || b === 13);
export const distinctLetters = text => new Set(text.toLowerCase().replace(/[^a-z]/g, '')).size;

// Text helpers used by several hint files.
export const count = (text, rx) => (text.match(rx) || []).length;
export const IPV4 = /\b(?:(?:25[0-5]|2[0-4]\d|1?\d?\d)\.){3}(?:25[0-5]|2[0-4]\d|1?\d?\d)\b/g;
export const URL_RX = /\b(?:https?|ftp):\/\/[^\s"'<>]{4,}/gi;
export const HASH_LENGTHS = { 32: 'MD5 / NTLM', 40: 'SHA-1', 56: 'SHA-224', 64: 'SHA-256', 96: 'SHA-384', 128: 'SHA-512' };
