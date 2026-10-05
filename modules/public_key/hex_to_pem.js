import { module } from './_cat.js';
import { A } from '../../core/registry.js';

const B64 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
function hex2b64(d) {
  let a = '', b, e;
  for (b = 0; b + 3 <= d.length; b += 3) {
    e = parseInt(d.substring(b, b + 3), 16);
    a += B64.charAt(e >> 6) + B64.charAt(e & 63);
  }
  if (b + 1 === d.length) {
    e = parseInt(d.substring(b, b + 1), 16);
    a += B64.charAt(e << 2);
  } else if (b + 2 === d.length) {
    e = parseInt(d.substring(b, b + 2), 16);
    a += B64.charAt(e >> 2) + B64.charAt((e & 3) << 4);
  }
  while (a.length & 3) a += '=';
  return a;
}

module('Hex to PEM', 'Wraps hex data as PEM with the given header label.', [A.string('Header string', 'CERTIFICATE')],
  (t, label) => {
    const body = hex2b64(t.replace(/\s/g, '')).replace(/(.{64})/g, '$1\r\n').replace(/\s+$/, '');
    return `-----BEGIN ${label}-----\r\n${body}\r\n-----END ${label}-----\r\n`;
  }, { text: true });
