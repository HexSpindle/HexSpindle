import { module } from './_cat.js';
import { A } from '../../core/registry.js';
import { openpgp, loadPrivateKey } from './_pgp.js';

module('PGP Decrypt', 'Decrypts an ASCII-armoured PGP message with the recipient’s private key (and passphrase, if it has one). Pretty Good Privacy (OpenPGP) is an encryption standard used for encrypting, decrypting and signing messages.',
  [A.area('Private key of recipient', ''), A.string('Private key passphrase', '')],
  async (data, recipientPrivKey, passphrase) => {
    const key = await loadPrivateKey(recipientPrivKey, passphrase || undefined);
    let message;
    try {
      message = await openpgp.readMessage({ armoredMessage: data });
    } catch (err) {
      throw new Error(`Couldn't parse the PGP message: ${err.message}`);
    }
    try {
      const { data: plaintext } = await openpgp.decrypt({ message, decryptionKeys: key, format: 'utf8' });
      return plaintext;
    } catch (err) {
      throw new Error(`Couldn't decrypt message with the provided private key: ${err.message}`);
    }
  }, { text: true });
