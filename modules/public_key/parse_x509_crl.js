import { module } from './_cat.js';
import { loadDerOrPem } from './_pem.js';
import { parseCrl, nameToRfc4514 } from './_x509.js';

function pad2(n) { return String(n).padStart(2, '0'); }
function fmtDate(d) {
  return `${d.getUTCFullYear()}-${pad2(d.getUTCMonth() + 1)}-${pad2(d.getUTCDate())} ${pad2(d.getUTCHours())}:${pad2(d.getUTCMinutes())}:${pad2(d.getUTCSeconds())}+00:00`;
}

module('Parse X.509 CRL', 'Decodes a certificate revocation list (PEM or DER).', [],
  (data) => {
    const { der } = loadDerOrPem(data);
    const crl = parseCrl(der);
    const out = [
      `Issuer: ${nameToRfc4514(crl.issuer)}`,
      `Last update: ${fmtDate(crl.thisUpdate)}`,
      `Next update: ${crl.nextUpdate ? fmtDate(crl.nextUpdate) : 'None'}`,
      `Signature algorithm: ${crl.sigAlgo.name}`,
      `Revoked certificates: ${crl.revoked.length}`,
    ];
    for (const r of crl.revoked) out.push(`  serial ${r.serial.toString(16)}  revoked ${fmtDate(r.revocationDate)}`);
    return out.join('\n');
  });
