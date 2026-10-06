import { module } from './_cat.js';
import { A } from '../../core/registry.js';
import { loadKeyInfo, rsaPrivateNumbersFromPkcs8Der } from './_pki.js';
import { pkcs1v15Sign, pssSign } from './_rsasign.js';
import { bytesToHex } from '../../core/util.js';
import { MD_ALGORITHMS } from './rsa_encrypt.js';

module('RSA Sign', 'Signs the input with an RSA private key (PKCS#1 v1.5 or PSS).',
  [A.area('RSA Private Key (PEM)', ''), A.string('Key password', ''),
    A.select('Message Digest Algorithm', ['SHA-256', 'SHA-1', 'SHA-384', 'SHA-512', 'MD5']),
    A.select('Padding', ['PKCS#1 v1.5', 'PSS']), A.select('Output format', ['Raw', 'Hex'])],
  async (data, pem, pw, md, paddingKind, outputFormat) => {
    if (!pem.replace('-----BEGIN RSA PRIVATE KEY-----', '').length) throw new Error('Please enter a private key.');
    const info = await loadKeyInfo(pem, pw || undefined);
    if (info.kind !== 'RSA') throw new Error(`Expected an RSA key, got ${info.kind}`);
    const { n, d } = rsaPrivateNumbersFromPkcs8Der(info.der);
    const sig = paddingKind.startsWith('PKCS') ? await pkcs1v15Sign(n, d, md, data) : await pssSign(n, d, md, data);
    return outputFormat === 'Hex' ? bytesToHex(sig) : sig;
  }, { nondeterministic: true });
