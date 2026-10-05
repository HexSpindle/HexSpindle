import { module } from './_cat.js';
import { A } from '../../core/registry.js';
import { openpgp, loadPublicKey, formatVerification } from './_pgp.js';

module('PGP Verify', 'Verifies an ASCII-armoured signed PGP message (as produced by "PGP Sign") against the signer’s public key, and outputs who signed it plus the verified data. Pretty Good Privacy (OpenPGP) is an encryption standard used for encrypting, decrypting and signing messages.',
  [A.area('Public key of signer', '')],
  async (data, signerPubKey) => {
    const key = await loadPublicKey(signerPubKey);
    let message;
    try {
      message = await openpgp.readMessage({ armoredMessage: data });
    } catch (err) {
      throw new Error(`Couldn't parse the PGP message: ${err.message}`);
    }
    let verified;
    try {
      verified = await openpgp.verify({ message, verificationKeys: key, format: 'utf8' });
    } catch (err) {
      throw new Error(`Couldn't verify message: ${err.message}`);
    }
    const plaintext = await verified.data;
    return formatVerification(verified.signatures, key, plaintext);
  }, { text: true });
