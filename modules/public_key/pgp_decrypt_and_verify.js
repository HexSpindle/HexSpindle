import { module } from './_cat.js';
import { A } from '../../core/registry.js';
import { openpgp, loadPrivateKey, loadPublicKey, formatVerification } from './_pgp.js';

module('PGP Decrypt and Verify', 'Decrypts an ASCII-armoured encrypted, signed PGP message with the recipient’s private key and verifies it against the signer’s public key, outputting who signed it plus the decrypted data. Pretty Good Privacy (OpenPGP) is an encryption standard used for encrypting, decrypting and signing messages.',
  [A.area('Public key of signer', ''), A.area('Private key of recipient', ''), A.string('Private key password', '')],
  async (data, signerPubKey, recipientPrivKey, passphrase) => {
    const pubKey = await loadPublicKey(signerPubKey);
    const privKey = await loadPrivateKey(recipientPrivKey, passphrase || undefined);
    let message;
    try {
      message = await openpgp.readMessage({ armoredMessage: data });
    } catch (err) {
      throw new Error(`Couldn't parse the PGP message: ${err.message}`);
    }
    let result;
    try {
      result = await openpgp.decrypt({ message, decryptionKeys: privKey, verificationKeys: pubKey, format: 'utf8' });
    } catch (err) {
      throw new Error(`Couldn't decrypt message: ${err.message}`);
    }
    return formatVerification(result.signatures, pubKey, result.data);
  }, { text: true });
