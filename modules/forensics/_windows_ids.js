// Windows security identifiers: binary <-> text conversion and the well-known names.
import { bytesToHex } from '../../core/util.js';

const WELL_KNOWN = {
  'S-1-0-0': 'Nobody', 'S-1-1-0': 'Everyone', 'S-1-2-0': 'Local', 'S-1-2-1': 'Console Logon', 'S-1-3-0': 'Creator Owner', 'S-1-3-1': 'Creator Group', 'S-1-3-4': 'Owner Rights',
  'S-1-5-1': 'Dialup', 'S-1-5-2': 'Network', 'S-1-5-3': 'Batch', 'S-1-5-4': 'Interactive', 'S-1-5-6': 'Service', 'S-1-5-7': 'Anonymous Logon', 'S-1-5-9': 'Enterprise Domain Controllers',
  'S-1-5-10': 'Self', 'S-1-5-11': 'Authenticated Users', 'S-1-5-12': 'Restricted Code', 'S-1-5-13': 'Terminal Server User', 'S-1-5-14': 'Remote Interactive Logon', 'S-1-5-15': 'This Organization',
  'S-1-5-17': 'IUSR', 'S-1-5-18': 'Local System (SYSTEM)', 'S-1-5-19': 'Local Service', 'S-1-5-20': 'Network Service', 'S-1-5-113': 'Local account', 'S-1-5-114': 'Local account and member of Administrators',
  'S-1-5-32-544': 'BUILTIN\\Administrators', 'S-1-5-32-545': 'BUILTIN\\Users', 'S-1-5-32-546': 'BUILTIN\\Guests', 'S-1-5-32-547': 'BUILTIN\\Power Users', 'S-1-5-32-548': 'BUILTIN\\Account Operators',
  'S-1-5-32-549': 'BUILTIN\\Server Operators', 'S-1-5-32-550': 'BUILTIN\\Print Operators', 'S-1-5-32-551': 'BUILTIN\\Backup Operators', 'S-1-5-32-552': 'BUILTIN\\Replicators',
  'S-1-5-32-554': 'BUILTIN\\Pre-Windows 2000 Compatible Access', 'S-1-5-32-555': 'BUILTIN\\Remote Desktop Users', 'S-1-5-32-556': 'BUILTIN\\Network Configuration Operators',
  'S-1-5-32-558': 'BUILTIN\\Performance Monitor Users', 'S-1-5-32-559': 'BUILTIN\\Performance Log Users', 'S-1-5-32-562': 'BUILTIN\\Distributed COM Users', 'S-1-5-32-568': 'BUILTIN\\IIS_IUSRS',
  'S-1-5-32-569': 'BUILTIN\\Cryptographic Operators', 'S-1-5-32-573': 'BUILTIN\\Event Log Readers', 'S-1-5-32-578': 'BUILTIN\\Hyper-V Administrators', 'S-1-5-32-580': 'BUILTIN\\Remote Management Users',
  'S-1-5-64-10': 'NTLM Authentication', 'S-1-5-64-14': 'SChannel Authentication', 'S-1-5-64-21': 'Digest Authentication', 'S-1-5-80-0': 'All Services', 'S-1-5-83-0': 'NT VIRTUAL MACHINE\\Virtual Machines',
  'S-1-15-2-1': 'All Application Packages', 'S-1-16-0': 'Untrusted integrity level', 'S-1-16-4096': 'Low integrity level', 'S-1-16-8192': 'Medium integrity level', 'S-1-16-8448': 'Medium Plus integrity level',
  'S-1-16-12288': 'High integrity level', 'S-1-16-16384': 'System integrity level', 'S-1-16-20480': 'Protected Process integrity level', 'S-1-18-1': 'Authentication authority asserted identity',
  'S-1-18-2': 'Service asserted identity',
};
// Relative identifiers that mean the same thing in every domain (S-1-5-21-<domain>-<RID>).
const DOMAIN_RIDS = { 498: 'Enterprise Read-only Domain Controllers', 500: 'Administrator', 501: 'Guest', 502: 'krbtgt', 503: 'DefaultAccount', 504: 'WDAGUtilityAccount', 512: 'Domain Admins', 513: 'Domain Users',
  514: 'Domain Guests', 515: 'Domain Computers', 516: 'Domain Controllers', 517: 'Cert Publishers', 518: 'Schema Admins', 519: 'Enterprise Admins', 520: 'Group Policy Creator Owners',
  521: 'Read-only Domain Controllers', 522: 'Cloneable Domain Controllers', 525: 'Protected Users', 526: 'Key Admins', 527: 'Enterprise Key Admins', 553: 'RAS and IAS Servers', 571: 'Allowed RODC Password Replication Group',
  572: 'Denied RODC Password Replication Group' };
const AUTHORITIES = { 0: 'Null', 1: 'World', 2: 'Local', 3: 'Creator', 4: 'Non-unique', 5: 'NT Authority', 11: 'Microsoft Account', 12: 'Azure AD', 15: 'Application Package', 16: 'Mandatory Label', 18: 'Authentication Authority' };

export function sidName(sid) {
  if (WELL_KNOWN[sid]) return WELL_KNOWN[sid];
  const m = /^S-1-5-21-\d+-\d+-\d+-(\d+)$/.exec(sid);
  if (m) return DOMAIN_RIDS[m[1]] ? `${DOMAIN_RIDS[m[1]]} (domain or local account, RID ${m[1]})` : `domain or local account, RID ${m[1]}${+m[1] >= 1000 ? ' (created after installation)' : ''}`;
  if (/^S-1-5-21-\d+-\d+-\d+$/.test(sid)) return 'a domain or computer identifier (no RID)';
  if (/^S-1-5-80-/.test(sid)) return 'a service account (NT SERVICE\\…)';
  if (/^S-1-5-82-/.test(sid)) return 'an IIS application pool identity';
  if (/^S-1-5-5-\d+-\d+$/.test(sid)) return 'a logon session';
  if (/^S-1-12-1-/.test(sid)) return 'an Azure AD (Entra ID) object';
  if (/^S-1-15-2-/.test(sid)) return 'an app container (packaged application)';
  if (/^S-1-15-3-/.test(sid)) return 'an app capability';
  return null;
}
export const authorityName = n => AUTHORITIES[n] || null;

export function sidToBytes(sid) {
  const m = /^S-(\d+)-(\d+|0x[0-9a-fA-F]+)((?:-\d+)*)$/i.exec(sid.trim());
  if (!m) throw new Error(`Not a SID: ${sid.trim().slice(0, 60)}`);
  const subs = m[3] ? m[3].slice(1).split('-').map(Number) : [];
  if (subs.length > 15 || subs.some(s => s > 0xffffffff)) throw new Error('A SID has at most 15 sub-authorities, each 32 bits');
  const out = new Uint8Array(8 + subs.length * 4), view = new DataView(out.buffer);
  out[0] = +m[1]; out[1] = subs.length;
  const authority = BigInt(m[2]);
  for (let i = 0; i < 6; i++) out[2 + i] = Number((authority >> BigInt(8 * (5 - i))) & 0xffn);   // big-endian, unlike the rest
  subs.forEach((s, i) => view.setUint32(8 + i * 4, s, true));
  return out;
}

export function bytesToSid(bytes) {
  if (bytes.length < 8 || bytes[0] !== 1 || bytes[1] > 15 || bytes.length < 8 + bytes[1] * 4) throw new Error('Not a binary SID (revision 1, count, 6-byte authority, 32-bit sub-authorities)');
  let authority = 0n;
  for (let i = 0; i < 6; i++) authority = (authority << 8n) | BigInt(bytes[2 + i]);
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength), subs = [];
  for (let i = 0; i < bytes[1]; i++) subs.push(view.getUint32(8 + i * 4, true));
  return { sid: ['S', bytes[0], authority.toString(), ...subs].join('-'), length: 8 + bytes[1] * 4 };
}
export const hexOf = bytes => bytesToHex(bytes);
