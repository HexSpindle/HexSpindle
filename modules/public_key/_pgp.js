import * as openpgp from './_openpgp.mjs';

export { openpgp };

export const PGP_KEY_TYPES = ['RSA-1024', 'RSA-2048', 'RSA-4096', 'ECC-256', 'ECC-384', 'ECC-521'];

const ECC_CURVES = { 256: 'nistP256', 384: 'nistP384', 521: 'nistP521' };

export function keyTypeToGenerateOptions(optionStr) {
  const [kind, sizeStr] = optionStr.split('-');
  const size = parseInt(sizeStr, 10);
  if (kind === 'RSA') return { type: 'rsa', rsaBits: size, config: { minRSABits: Math.min(1024, size) } };
  const curve = ECC_CURVES[size];
  if (!curve) throw new Error(`Unsupported ECC key size: ${size}`);
  return { type: 'ecc', curve };
}

export function buildUserIds(name, email) {
  const id = {};
  if (name) id.name = name;
  if (email) id.email = email;
  return [id];
}

export async function loadPublicKey(armored) {
  if (!armored || !armored.trim()) throw new Error('Enter a public key.');
  try {
    return await openpgp.readKey({ armoredKey: armored });
  } catch (err) {
    throw new Error(`Couldn't parse public key: ${err.message}`);
  }
}

export async function loadPrivateKey(armored, passphrase) {
  if (!armored || !armored.trim()) throw new Error('Enter a private key.');
  let key;
  try {
    key = await openpgp.readPrivateKey({ armoredKey: armored });
  } catch (err) {
    throw new Error(`Couldn't parse private key: ${err.message}`);
  }
  if (!key.isDecrypted()) {
    if (!passphrase) throw new Error('This private key is passphrase-protected. Enter the passphrase.');
    try {
      key = await openpgp.decryptKey({ privateKey: key, passphrase });
    } catch (err) {
      throw new Error(`Couldn't decrypt private key: ${err.message}`);
    }
  }
  return key;
}

export async function formatVerification(signatures, verificationKeys, data) {
  if (!signatures || !signatures.length) throw new Error('The data does not appear to be signed.');
  const sig0 = signatures[0];
  let verifyErr = null;
  try { await sig0.verified; } catch (err) { verifyErr = err; }

  const keys = Array.isArray(verificationKeys) ? verificationKeys : [verificationKeys];
  const signer = keys.find((k) => k.getKeyIDs().some((id) => id.equals(sig0.keyID))) || keys[0];

  if (verifyErr) {
    throw new Error(`Signature verification failed (key ID ${sig0.keyID.toHex().toUpperCase()}): ${verifyErr.message}`);
  }

  let name = '', comment = '', email = '';
  try {
    const primaryUser = await signer.getPrimaryUser();
    const uid = primaryUser.user.userID;
    if (uid) ({ name, comment, email } = { name: uid.name || '', comment: uid.comment || '', email: uid.email || '' });
  } catch { /* no user ID available */ }

  let signedOn = '';
  try {
    const sigPackets = (await sig0.signature).packets;
    if (sigPackets.length) signedOn = sigPackets[0].created.toUTCString();
  } catch { /* signature packet unavailable */ }

  let text = 'Signed by ';
  if (email || name || comment) {
    if (name) text += `${name} `;
    if (comment) text += `(${comment}) `;
    if (email) text += `<${email}>`;
    text += '\n';
  }
  text += [
    // kbpgp's "short key id" is the last four bytes of the fingerprint; its fingerprint is lower case.
    `PGP key ID: ${signer.getFingerprint().slice(-8).toUpperCase()}`,
    `PGP fingerprint: ${signer.getFingerprint().toLowerCase()}`,
    `Signed on ${signedOn}`,
    '----------------------------------\n',
  ].join('\n');
  text += typeof data === 'string' ? data : '';

  return text.trim();
}
