import { module } from './_cat.js';
import { loadDerOrPem } from './_pem.js';
import { parseX509 } from './_x509.js';
import { toPem } from './_pem.js';

module('Public Key from Certificate', 'Extracts the public key (PEM) from an X.509 certificate.', [],
  (data) => {
    const { der } = loadDerOrPem(data);
    const cert = parseX509(der);
    return toPem(cert.tbs.spkiRaw, 'PUBLIC KEY');
  });
