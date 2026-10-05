import { module } from './_cat.js';
import { A } from '../../core/registry.js';
import { base64Decode, decodeUtf8 } from '../../core/util.js';

function b64u(s) { return decodeUtf8(base64Decode(s)); }

module('JWT Decode', "Decodes a JSON Web Token and shows its payload (signature is not verified). Enable 'Show header and signature' to see the full token.",
  [A.boolean('Show header and signature', false)],
  (t, full) => {
    const parts = t.trim().split('.');
    if (parts.length < 2) throw new Error('Not a JWT');
    const payload = JSON.parse(b64u(parts[1]));
    if (!full) return JSON.stringify(payload, null, 2);
    return JSON.stringify({
      header: JSON.parse(b64u(parts[0])),
      payload,
      signature: parts.length > 2 ? parts[2] : '',
    }, null, 2);
  }, { text: true });
