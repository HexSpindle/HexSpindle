import { module } from './_cat.js';
import { A } from '../../core/registry.js';
import { openpgp, loadPublicKey } from './_pgp.js';

module('PGP Encrypt', 'Encrypts the input with a PGP public key, producing an ASCII-armoured PGP message. Pretty Good Privacy (OpenPGP) is an encryption standard used for encrypting, decrypting and signing messages.',
  [A.area('Public key of recipient', '')],
  async (data, recipientPubKey) => {
    const key = await loadPublicKey(recipientPubKey);
    const message = await openpgp.createMessage({ text: data });
    try {
      return await openpgp.encrypt({ message, encryptionKeys: key, format: 'armored' });
    } catch (err) {
      throw new Error(`Couldn't encrypt message with the provided public key: ${err.message}`);
    }
  }, { text: true });
