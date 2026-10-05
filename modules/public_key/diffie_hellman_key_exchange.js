import { module } from './_cat.js';
import { A } from '../../core/registry.js';
import { modExp, randomBelow } from './_bignum.js';

const GROUPS = {
  'Group 14 (2048-bit)': [2n, BigInt('0xFFFFFFFFFFFFFFFFC90FDAA22168C234C4C6628B80DC1CD129024E088A67CC74020BBEA63B139B22514A08798E3404DDEF9519B3CD3A431B302B0A6DF25F14374FE1356D6D51C245E485B576625E7EC6F44C42E9A637ED6B0BFF5CB6F406B7EDEE386BFB5A899FA5AE9F24117C4B1FE649286651ECE45B3DC2007CB8A163BF0598DA48361C55D39A69163FA8FD24CF5F83655D23DCA3AD961C62F356208552BB9ED529077096966D670C354E4ABC9804F1746C08CA18217C32905E462E36CE3BE39E772C180E86039B2783A2EC07A28FB5C55DF06F4C52C9DE2BCBF6955817183995497CEA956AE515D2261898FA051015728E5A8AACAA68FFFFFFFFFFFFFFFF')],
  'Group 5 (1536-bit)': [2n, BigInt('0xFFFFFFFFFFFFFFFFC90FDAA22168C234C4C6628B80DC1CD129024E088A67CC74020BBEA63B139B22514A08798E3404DDEF9519B3CD3A431B302B0A6DF25F14374FE1356D6D51C245E485B576625E7EC6F44C42E9A637ED6B0BFF5CB6F406B7EDEE386BFB5A899FA5AE9F24117C4B1FE649286651ECE45B3DC2007CB8A163BF0598DA48361C55D39A69163FA8FD24CF5F83655D23DCA3AD961C62F356208552BB9ED5277097FFFFFFFFFFFFFFFF')],
};

module('Diffie-Hellman Key Exchange', "Classic finite-field Diffie-Hellman. 'Generate keypair' makes a private exponent and public value to send to the other party; 'Compute shared secret' combines your private value with their public value.",
  [A.select('Group', Object.keys(GROUPS)), A.select('Action', ['Generate keypair', 'Compute shared secret']), A.string('Your private value (hex, for computing the secret)', ''), A.string('Their public value (hex)', '')],
  (t, group, action, privHex, pubHex) => {
    const [g, p] = GROUPS[group];
    if (action === 'Generate keypair') {
      const priv = randomBelow(p - 2n) + 2n;
      const pub = modExp(g, priv, p);
      return `Private value (keep secret, hex):\n${priv.toString(16)}\n\nPublic value (send to the other party, hex):\n${pub.toString(16)}`;
    }
    const priv = BigInt('0x' + (privHex || t));
    const pubOther = BigInt('0x' + pubHex);
    const secret = modExp(pubOther, priv, p);
    return secret.toString(16);
  }, { text: true, nondeterministic: true });
