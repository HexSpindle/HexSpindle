import { module } from './_cat.js';
import { A } from '../../core/registry.js';
import { openpgp, loadPrivateKey, loadPublicKey } from './_pgp.js';

module('PGP Encrypt and Sign', 'Signs the input with the sender’s PGP private key and encrypts it with the recipient’s PGP public key, producing an ASCII-armoured encrypted, signed PGP message. Pretty Good Privacy (OpenPGP) is an encryption standard used for encrypting, decrypting and signing messages.',
  [A.area('Private key of signer', ''), A.string('Private key passphrase', ''), A.area('Public key of recipient', '')],
  async (data, signerPrivKey, passphrase, recipientPubKey) => {
    const privKey = await loadPrivateKey(signerPrivKey, passphrase || undefined);
    const pubKey = await loadPublicKey(recipientPubKey);
    const message = await openpgp.createMessage({ text: data });
    try {
      return await openpgp.encrypt({ message, encryptionKeys: pubKey, signingKeys: privKey, format: 'armored' });
    } catch (err) {
      throw new Error(`Couldn't encrypt and sign message: ${err.message}`);
    }
  }, { text: true });
