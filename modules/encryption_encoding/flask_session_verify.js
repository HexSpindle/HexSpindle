import { module } from './_cat.js';
import { A } from '../../core/registry.js';
import { verify } from './_flasksession.js';

module('Flask Session Verify', 'Verifies and decodes a Flask session cookie with the given SECRET_KEY.',
  [A.string('Secret key', ''), A.number('Max age (seconds, 0 = no limit)', 0, 0)],
  async (t, secret, maxAge) => JSON.stringify(await verify(t.trim(), secret, maxAge || null), null, 2), { text: true });
