import { module } from './_cat.js';
import { A } from '../../core/registry.js';
import { openpgp, loadPrivateKey } from './_pgp.js';

module('PGP Sign', 'Signs the input with the sender’s PGP private key, producing an ASCII-armoured signed PGP message (not detached). Pretty Good Privacy (OpenPGP) is an encryption standard used for encrypting, decrypting and signing messages.',
  [A.area('Private key of signer', ''), A.string('Private key passphrase (optional)', '')],
  async (data, signerPrivKey, passphrase) => {
    const key = await loadPrivateKey(signerPrivKey, passphrase || undefined);
    const message = await openpgp.createMessage({ text: data });
    try {
      return await openpgp.sign({ message, signingKeys: key, format: 'armored' });
    } catch (err) {
      throw new Error(`Couldn't sign message: ${err.message}`);
    }
  }, { text: true });
