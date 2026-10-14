import { module } from './_cat.js';
import { base64Decode } from '../../core/util.js';
import { parseOneDer } from '../public_key/_asn1.js';

const RECORD_TAGS = { v: 'version', k: 'key type', p: 'public key', h: 'acceptable hash algorithms', t: 'flags', s: 'service type', n: 'notes', g: 'granularity (obsolete)' };
const SIGNATURE_TAGS = { v: 'version', a: 'algorithm', d: 'signing domain', s: 'selector', c: 'canonicalization (header/body)', q: 'query method', h: 'signed headers', bh: 'body hash', b: 'signature',
  t: 'signed at', x: 'expires at', l: 'body length signed', i: 'agent or user identity', z: 'copied headers' };

export const tagList = text => { const out = {}; for (const part of text.split(';')) { const eq = part.indexOf('='); if (eq > 0) out[part.slice(0, eq).trim()] = part.slice(eq + 1).replace(/\s+/g, ''); } return out; };

// The RSA modulus length, read from the DER-encoded SubjectPublicKeyInfo in the p= tag.
function rsaBits(p) {
  try {
    const spki = parseOneDer(base64Decode(p));
    const key = parseOneDer(spki.children[1].value.subarray(1));
    const modulus = key.children[0].value;
    return (modulus[0] === 0 ? modulus.length - 1 : modulus.length) * 8;
  } catch { return null; }
}

module('Parse DKIM Record',
  'Explains either a DKIM key record (the "v=DKIM1; k=rsa; p=…" TXT record published at selector._domainkey.domain) or a DKIM-Signature header from an email, tag by tag. '
  + 'For key records it reports the RSA key length and flags revoked keys, test mode and keys shorter than 1024 or 2048 bits; for signatures it shows which headers are covered and where the public key is published.',
  [],
  (t) => {
    const signature = /^dkim-signature:/i.test(t.trim()) || /\bbh=/.test(t);
    const text = t.replace(/^dkim-signature:/i, '').replace(/^[^"]*?TXT\s+/i, '').replace(/"\s*"/g, '').replace(/"/g, '').replace(/\r?\n[ \t]*/g, '');
    const tags = tagList(text), names = signature ? SIGNATURE_TAGS : RECORD_TAGS;
    if (!Object.keys(tags).length) throw new Error('No tag=value pairs found');
    const lines = [signature ? 'DKIM-Signature header' : 'DKIM key record', ''], warnings = [];
    for (const [k, v] of Object.entries(tags)) {
      let shown = v.length > 70 ? `${v.slice(0, 32)}…${v.slice(-16)} (${v.length} characters)` : v;
      if ((k === 't' || k === 'x') && signature && /^\d+$/.test(v)) shown += `  (${new Date(+v * 1000).toISOString()})`;
      if (k === 'h' && signature) shown = v.split(':').join(', ');
      lines.push(`${k.padEnd(3)} ${(names[k] || 'unknown tag').padEnd(32)} ${shown}`);
    }
    if (signature) {
      if (tags.d && tags.s) lines.push('', `Public key is published at: ${tags.s}._domainkey.${tags.d} (TXT)`);
      if (tags.a && /sha1/i.test(tags.a)) warnings.push('rsa-sha1 is obsolete (RFC 8301) and treated as unsigned by many receivers');
      if (tags.l) warnings.push('l= signs only part of the body, so content can be appended without breaking the signature');
      const signed = (tags.h || '').toLowerCase().split(':');
      for (const required of ['from', 'subject', 'date', 'to']) if (!signed.includes(required)) warnings.push(`the ${required[0].toUpperCase() + required.slice(1)} header is not signed${required === 'from' ? ' (required by the standard)' : ''}`);
    } else {
      if (tags.p === '' || !('p' in tags)) warnings.push(tags.p === '' ? 'p= is empty: this key has been revoked' : 'no p= tag: the record has no public key');
      else if ((tags.k || 'rsa') === 'rsa') {
        const bits = rsaBits(tags.p);
        lines.push('', `RSA key length: ${bits ? bits + ' bits' : 'could not be read'}`);
        if (bits && bits < 1024) warnings.push(`${bits}-bit key: receivers ignore keys under 1024 bits`);
        else if (bits && bits < 2048) warnings.push(`${bits}-bit key: 2048 bits is the current recommendation`);
      }
      if (/\by\b/.test(tags.t || '')) warnings.push('t=y: the domain is testing DKIM; receivers must not treat failures differently from unsigned mail');
      if (tags.v && tags.v !== 'DKIM1') warnings.push(`v=${tags.v} is not DKIM1; receivers ignore the record`);
    }
    lines.push('', warnings.length ? 'Warnings:\n' + warnings.map(w => `  - ${w}`).join('\n') : 'No problems found.');
    return lines.join('\n');
  }, { text: true, aliases: ['dkim', 'domainkey', 'dkim-signature'] });
