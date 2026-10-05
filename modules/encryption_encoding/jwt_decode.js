import { module } from './_cat.js';
import { base64Decode, decodeUtf8 } from '../../core/util.js';

function b64u(s) { return decodeUtf8(base64Decode(s)); }

module('JWT Decode', "Decodes a JSON Web Token's header and payload (signature is not verified).", [],
  (t) => {
    const parts = t.trim().split('.');
    if (parts.length < 2) throw new Error('Not a JWT');
    return JSON.stringify({
      header: JSON.parse(b64u(parts[0])),
      payload: JSON.parse(b64u(parts[1])),
      signature: parts.length > 2 ? parts[2] : '',
    }, null, 2);
  }, { text: true });
