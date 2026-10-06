import { module } from './_cat.js';
import { A } from '../../core/registry.js';
import { openpgp, PGP_KEY_TYPES, keyTypeToGenerateOptions, buildUserIds } from './_pgp.js';

const YEAR = 86400 * 365;

module('Generate PGP Key Pair', 'Generates a new ASCII-armoured PGP public/private key pair (primary key plus signing and encryption subkeys). Supports RSA and elliptic-curve (EC) keys. The input is ignored.',
  [A.select('Key type', PGP_KEY_TYPES), A.string('Password (optional)', ''), A.string('Name (optional)', ''), A.string('Email (optional)', '')],
  async (data, keyType, password, name, email) => {
    const opts = keyTypeToGenerateOptions(keyType);
    const subOpts = opts.type === 'rsa' ? { type: 'rsa', rsaBits: opts.rsaBits } : { type: 'ecc', curve: opts.curve };
    const { privateKey, publicKey } = await openpgp.generateKey({
      ...opts,
      config: { ...(opts.config || {}), minRSABits: 1024 },
      keyExpirationTime: 0,
      subkeys: [{ ...subOpts, sign: true, keyExpirationTime: 8 * YEAR }, { ...subOpts, keyExpirationTime: 2 * YEAR }],
      userIDs: buildUserIds(name, email),
      passphrase: password || undefined,
      format: 'armored',
    });
    return privateKey + '\n' + publicKey.trim();
  }, { text: true, nondeterministic: true });
