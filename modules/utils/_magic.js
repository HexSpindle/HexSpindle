// Magic hints for text utilities.
import { analyses, decodes, count } from '../../core/magic-detect.js';

decodes('Remove ANSI Escape Codes', ({ bytes }) => {
  let escapes = 0;
  for (let i = 0; i + 1 < bytes.length && i < 65536; i++) if (bytes[i] === 0x1b && bytes[i + 1] === 0x5b) escapes++;
  return escapes >= 2 ? 0.9 : null;
});
decodes('From Case Insensitive Regex', ({ ascii, text }) => ascii && /(?:\[[a-z][A-Z]\]|\[[A-Z][a-z]\]){3,}/.test(text) ? 0.9 : null);

analyses('Secret Scanner', ({ isText, head }) => isText && /\s/.test(head)
  && count(head, /\b(?:api[_-]?key|secret|token|passw(?:or)?d|authorization)\b\s*[:=]|AKIA[0-9A-Z]{16}|-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----|\bgh[pousr]_[A-Za-z0-9]{30,}/gi) >= 1 ? 0.6 : null);
