import { module } from './_cat.js';
import { parseX509ToText } from './parse_x509_certificate.js';

const BEGIN = '-----BEGIN CERTIFICATE-----';
const END = '-----END CERTIFICATE-----';
const PEM_BODY_RE = /^[A-Za-z0-9+/=\s]+$/;

module('Parse X.509 certificate bundles', 'Parses a PEM file containing one or more X.509 certificates and displays the validity, issuer, subject, extensions and other details of each certificate in order.', [],
  async (data) => {
    const input = typeof data === 'string' ? data : new TextDecoder('latin1').decode(data);
    if (!input.length) return 'No input';
    if (input.length > 2_000_000) throw new Error('Certificate bundle exceeds 2 MB');

    const output = [];
    let position = 0;
    while (position < input.length) {
      const start = input.indexOf(BEGIN, position);
      if (start === -1) break;
      if (input.slice(position, start).trim()) throw new Error('Invalid certificate bundle content');
      if (output.length >= 100) throw new Error('Certificate bundle exceeds 100 certificates');

      const finish = input.indexOf(END, start + BEGIN.length);
      if (finish === -1) throw new Error(`Certificate ${output.length + 1}: PEM footer not found`);

      try {
        if (!PEM_BODY_RE.test(input.slice(start + BEGIN.length, finish))) throw new Error('Invalid PEM body');
        const block = input.slice(start, finish + END.length);
        output.push(`Certificate ${output.length + 1}:\n${await parseX509ToText(block, 'PEM')}`);
      } catch (err) {
        throw new Error(`Certificate ${output.length + 1}: Certificate load error (non-certificate input?)`);
      }
      position = finish + END.length;
    }

    if (input.slice(position).trim() || !output.length) throw new Error('Invalid certificate bundle content');
    return output.join('\n\n');
  }, { text: true, nondeterministic: true });
