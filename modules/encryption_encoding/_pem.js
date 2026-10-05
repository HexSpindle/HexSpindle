export function pemToDer(pem) {
  const match = pem.match(/-----BEGIN ([^-]+)-----([\s\S]*?)-----END \1-----/);
  if (!match) throw new Error('Not a valid PEM block');
  const label = match[1].trim();
  const b64 = match[2].replace(/\s+/g, '');
  const bin = atob(b64);
  const der = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) der[i] = bin.charCodeAt(i);
  return { label, der };
}

export async function importPrivateKey(pem, algorithm, usages) {
  const { label, der } = pemToDer(pem);
  if (label !== 'PRIVATE KEY') {
    throw new Error(`Unsupported private key format "${label}" - only PKCS#8 ("-----BEGIN PRIVATE KEY-----") is supported`);
  }
  return crypto.subtle.importKey('pkcs8', der, algorithm, false, usages);
}

export async function importPublicKey(pem, algorithm, usages) {
  const { label, der } = pemToDer(pem);
  if (label !== 'PUBLIC KEY') {
    throw new Error(`Unsupported public key format "${label}" - only SPKI ("-----BEGIN PUBLIC KEY-----") is supported`);
  }
  return crypto.subtle.importKey('spki', der, algorithm, false, usages);
}
