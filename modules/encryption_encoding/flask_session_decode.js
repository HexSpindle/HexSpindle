import { module } from './_cat.js';
import { loadPayload } from './_flasksession.js';

module('Flask Session Decode', "Decodes a Flask session cookie's payload without verifying its signature (shows the JSON that was stored - the signature is not checked).", [],
  async (t) => {
    let s = t.trim();
    const compressed = s.startsWith('.');
    if (compressed) s = s.slice(1);
    const payload = (compressed ? '.' : '') + s.split('.')[0];
    return JSON.stringify(await loadPayload(payload), null, 2);
  }, { text: true });
