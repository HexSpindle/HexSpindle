import { module } from './_cat.js';
import { A } from '../../core/registry.js';
import { base64Decode, decodeUtf8, encodeUtf8 } from '../../core/util.js';
import { streamTransform } from '../compression/_streams.js';
import { parseXml } from './_xml_lite.js';

const findAll = (node, local, out = []) => {
  if (typeof node === 'string') return out;
  if (node.name.replace(/^.*:/, '') === local) out.push(node);
  for (const c of node.children) findAll(c, local, out);
  return out;
};
const first = (node, local) => findAll(node, local)[0];
const text = node => node ? node.children.filter(c => typeof c === 'string').join('').trim() : undefined;

function summarise(root) {
  const kind = root.name.replace(/^.*:/, '');
  const lines = [`SAML ${kind}`];
  const attr = (n, name) => n && (n.attrs[name] ?? Object.entries(n.attrs).find(([k]) => k.replace(/^.*:/, '') === name)?.[1]);
  if (attr(root, 'ID')) lines.push(`ID: ${attr(root, 'ID')}`);
  if (attr(root, 'IssueInstant')) lines.push(`Issued at: ${attr(root, 'IssueInstant')}`);
  if (attr(root, 'Destination')) lines.push(`Destination: ${attr(root, 'Destination')}`);
  if (attr(root, 'InResponseTo')) lines.push(`In response to: ${attr(root, 'InResponseTo')}`);
  const issuer = first(root, 'Issuer'); if (issuer) lines.push(`Issuer: ${text(issuer)}`);
  const status = first(root, 'StatusCode'); if (status) lines.push(`Status: ${(attr(status, 'Value') || '').replace(/^.*:/, '')}`);
  const assertion = first(root, 'Assertion');
  if (assertion) {
    const subject = first(assertion, 'NameID'); if (subject) lines.push(`Subject (NameID): ${text(subject)}${attr(subject, 'Format') ? ` [${attr(subject, 'Format').replace(/^.*:/, '')}]` : ''}`);
    const conditions = first(assertion, 'Conditions'); if (conditions) lines.push(`Valid: ${attr(conditions, 'NotBefore') || '?'} to ${attr(conditions, 'NotOnOrAfter') || '?'}`);
    const audiences = findAll(assertion, 'Audience').map(text); if (audiences.length) lines.push(`Audience: ${audiences.join(', ')}`);
    const authn = first(assertion, 'AuthnContextClassRef'); if (authn) lines.push(`Authentication method: ${text(authn).replace(/^.*:/, '')}`);
    const attrs = findAll(assertion, 'Attribute');
    if (attrs.length) { lines.push('Attributes:'); for (const a of attrs) lines.push(`  ${attr(a, 'Name')}: ${findAll(a, 'AttributeValue').map(text).join(', ')}`); }
  }
  const signed = !!first(root, 'Signature');
  lines.push('', `Signed: ${signed ? 'yes (an XML Signature is present; this operation does not verify it)' : 'no signature found'}`);
  if (first(root, 'EncryptedAssertion')) lines.push('The assertion is encrypted and cannot be read without the service provider\'s private key.');
  return lines.join('\n');
}

async function toXml(data) {
  const text = decodeUtf8(data).trim();
  // POST binding is Base64 of XML; Redirect binding is Base64 of raw-DEFLATE of XML, usually URL-encoded first.
  if (text.startsWith('<')) return text;
  const b64 = /%[0-9A-Fa-f]{2}/.test(text) ? decodeURIComponent(text) : text;
  let bytes; try { bytes = base64Decode(b64.replace(/\s/g, '')); } catch { throw new Error('Input is neither XML nor Base64'); }
  const asText = decodeUtf8(bytes).trim();
  if (asText.startsWith('<')) return asText;
  try { const inflated = decodeUtf8(await streamTransform(bytes, 'deflate-raw', 'decompress')); if (inflated.trim().startsWith('<')) return inflated; } catch { /* not deflate */ }
  throw new Error('Could not decode the SAML message (expected XML, Base64 of XML, or Base64 of DEFLATE-compressed XML)');
}

module('Decode SAML Message',
  'Decodes a SAML message from an SSO exchange — a SAMLRequest or SAMLResponse — through either binding: POST (Base64 of XML) or Redirect (URL-encoded Base64 of DEFLATE-compressed XML). '
  + 'Returns the XML, or a summary of the issuer, subject (NameID), audience, validity window, status, attributes and whether it is signed or encrypted. The XML signature is shown but not verified.',
  [A.select('Output', ['Summary', 'XML'])],
  async (data, output) => {
    const xml = await toXml(data);
    if (output === 'XML') return xml;
    let root; try { root = parseXml(xml); } catch (e) { throw new Error(`Decoded, but the XML could not be parsed: ${e.message}`); }
    return summarise(root);
  }, { aliases: ['saml', 'samlrequest', 'samlresponse', 'sso', 'single sign-on'] });
