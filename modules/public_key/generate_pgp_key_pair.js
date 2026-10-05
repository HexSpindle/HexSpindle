import { module } from './_cat.js';
import { A } from '../../core/registry.js';
import { openpgp, PGP_KEY_TYPES, keyTypeToGenerateOptions, buildUserIds } from './_pgp.js';

module('Generate PGP Key Pair', 'Generates a new ASCII-armoured PGP public/private key pair. Supports RSA and elliptic-curve (EC) keys. The input is ignored.',
  [A.select('Key type', PGP_KEY_TYPES), A.string('Password (optional)', ''), A.string('Name (optional)', ''), A.string('Email (optional)', '')],
  async (data, keyType, password, name, email) => {
    const opts = keyTypeToGenerateOptions(keyType);
    const { privateKey, publicKey } = await openpgp.generateKey({
      ...opts,
      userIDs: buildUserIds(name, email),
      passphrase: password || undefined,
      format: 'armored',
    });
    return privateKey + '\n' + publicKey.trim() + '\n';
  }, { text: true, nondeterministic: true });
