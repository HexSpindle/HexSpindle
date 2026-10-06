import { module } from './_cat.js';
import { A } from '../../core/registry.js';
import { verifyFull } from './_flasksession.js';

module('Flask Session Verify', 'Verifies and decodes a Flask session cookie with the given SECRET_KEY.',
  [A.string('Secret key', ''), A.number('Max age (seconds, 0 = no limit)', 0, 0), A.boolean('View timestamp', true)],
  async (t, secret, maxAge, viewTs) => {
    const { payload, timestamp } = await verifyFull(t.trim(), secret, maxAge || null);
    const out = { valid: true, payload };
    if (viewTs) out.timestamp = timestamp;
    return JSON.stringify(out, null, 4);
  }, { text: true });
