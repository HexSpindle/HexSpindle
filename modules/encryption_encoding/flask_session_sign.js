import { module } from './_cat.js';
import { A } from '../../core/registry.js';
import { sign } from './_flasksession.js';

module('Flask Session Sign', "Signs JSON as a Flask-style session cookie using the given SECRET_KEY (itsdangerous URLSafeTimedSerializer, salt='cookie-session').",
  [A.string('Secret key', '')],
  async (t, secret) => sign(JSON.parse(t), secret), { text: true });
