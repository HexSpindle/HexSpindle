import { module } from './_cat.js';
import { sidName } from './_windows_ids.js';

// Two-letter trustee aliases defined by the SDDL grammar.
const ALIASES = { AO: 'Account Operators', AN: 'Anonymous Logon', AU: 'Authenticated Users', BA: 'BUILTIN\\Administrators', BG: 'BUILTIN\\Guests', BO: 'Backup Operators', BU: 'BUILTIN\\Users',
  CA: 'Certificate Publishers', CD: 'Certificate Service DCOM Access', CG: 'Creator Group', CO: 'Creator Owner', DA: 'Domain Admins', DC: 'Domain Computers', DD: 'Domain Controllers', DG: 'Domain Guests',
  DU: 'Domain Users', EA: 'Enterprise Admins', ED: 'Enterprise Domain Controllers', WD: 'Everyone', PA: 'Group Policy Admins', IU: 'Interactive Users', LA: 'Local Administrator', LG: 'Local Guest',
  LS: 'Local Service', SY: 'Local System', NU: 'Network Logon Users', NO: 'Network Configuration Operators', NS: 'Network Service', PO: 'Printer Operators', PS: 'Self', PU: 'Power Users',
  RS: 'RAS Servers', RD: 'Remote Desktop Users', RE: 'Replicator', RC: 'Restricted Code', SA: 'Schema Admins', SO: 'Server Operators', SU: 'Service Logon Users', RU: 'Pre-Windows 2000 Compatible Access',
  AC: 'All Application Packages', OW: 'Owner Rights', WR: 'Write Restricted Code', LW: 'Low integrity', ME: 'Medium integrity', MP: 'Medium Plus integrity', HI: 'High integrity', SI: 'System integrity',
  ER: 'Event Log Readers', KA: 'Key Admins', EK: 'Enterprise Key Admins', RO: 'Enterprise Read-only Domain Controllers', CN: 'Cloneable Domain Controllers', MU: 'Performance Monitor Users',
  LU: 'Performance Log Users', IS: 'IIS Users', CY: 'Crypto Operators', HA: 'Hyper-V Administrators', RM: 'Remote Management Users', UD: 'User-mode Drivers', AS: 'Authentication Authority Asserted Identity' };
const ACE_TYPES = { A: 'Allow', D: 'Deny', OA: 'Allow (object-specific)', OD: 'Deny (object-specific)', AU: 'Audit', OU: 'Audit (object-specific)', AL: 'Alarm', OL: 'Alarm (object-specific)',
  ML: 'Mandatory integrity label', XA: 'Allow (conditional)', XD: 'Deny (conditional)', XU: 'Audit (conditional)', RA: 'Resource attribute', SP: 'Scoped policy', TL: 'Process trust label' };
const ACE_FLAGS = { CI: 'child containers inherit', OI: 'child objects inherit', NP: 'do not propagate further', IO: 'inherit only (does not apply here)', ID: 'inherited', SA: 'audit success', FA: 'audit failure', CR: 'critical' };
const RIGHTS = { GA: 'Generic All', GR: 'Generic Read', GW: 'Generic Write', GX: 'Generic Execute', RC: 'Read Control', SD: 'Delete', WD: 'Write DAC', WO: 'Write Owner', RP: 'Read Property', WP: 'Write Property',
  CC: 'Create Child', DC: 'Delete Child', LC: 'List Children', SW: 'Self Write', LO: 'List Object', DT: 'Delete Tree', CR: 'Control Access (extended right)', FA: 'File All Access', FR: 'File Read', FW: 'File Write',
  FX: 'File Execute', KA: 'Key All Access', KR: 'Key Read', KW: 'Key Write', KX: 'Key Execute', NW: 'No Write Up', NR: 'No Read Up', NX: 'No Execute Up' };
const MASK_BITS = [[0x10000000, 'Generic All'], [0x80000000, 'Generic Read'], [0x40000000, 'Generic Write'], [0x20000000, 'Generic Execute'], [0x01000000, 'Access System Security'], [0x00100000, 'Synchronize'],
  [0x00080000, 'Write Owner'], [0x00040000, 'Write DAC'], [0x00020000, 'Read Control'], [0x00010000, 'Delete']];
const CONTROL = { P: 'protected (does not inherit from the parent)', AR: 'inheritance was requested', AI: 'ACEs were inherited automatically', NO_ACCESS_CONTROL: 'null ACL: no access control at all' };

const trustee = t => ALIASES[t] ? `${ALIASES[t]} (${t})` : /^S-1-/i.test(t) ? `${t}${sidName(t.toUpperCase()) ? ` = ${sidName(t.toUpperCase())}` : ''}` : t;

function rights(text) {
  if (/^0x[0-9a-f]+$/i.test(text)) {
    const mask = parseInt(text, 16) >>> 0, named = MASK_BITS.filter(([bit]) => mask & bit).map(([, name]) => name), specific = mask & 0xffff;
    return `${text} = ${[...named, specific ? `object-specific rights 0x${specific.toString(16)}` : null].filter(Boolean).join(', ') || 'no rights'}${mask === 0x1f01ff ? ' (full control of a file)' : mask === 0xf003f ? ' (full control of a registry key)' : ''}`;
  }
  const codes = text.match(/../g) || [];
  return codes.map(c => RIGHTS[c] || `unknown right ${c}`).join(', ') || 'no rights';
}

function ace(body, n) {
  const f = body.split(';');
  if (f.length < 6) return `  ${n}. malformed ACE: (${body})`;
  const flags = (f[1].match(/../g) || []).map(x => ACE_FLAGS[x] || x);
  const lines = [`  ${n}. ${ACE_TYPES[f[0]] || `ACE type ${f[0]}`}: ${trustee(f[5])}`, `       rights: ${rights(f[2])}`];
  if (flags.length) lines.push(`       flags:  ${flags.join('; ')}`);
  if (f[3]) lines.push(`       applies to object or property: ${f[3]}`);
  if (f[4]) lines.push(`       inherited by objects of type: ${f[4]}`);
  if (f[6]) lines.push(`       condition: ${f.slice(6).join(';')}`);
  return lines.join('\n');
}

module('Parse SDDL',
  'Explains a Windows security descriptor written in SDDL (the O:…G:…D:(A;;GA;;;BA) strings shown by sc sdshow, icacls /save, Get-Acl, event logs and Active Directory tools): '
  + 'owner, group, and every access-control entry in the DACL and SACL with its type, trustee, rights and inheritance flags.',
  [],
  (t) => {
    const sddl = t.trim().replace(/\s+/g, '');
    if (!/^(?:[OGDS]:)/.test(sddl)) throw new Error('SDDL starts with O:, G:, D: or S:');
    const out = [];
    for (const m of sddl.matchAll(/([OGDS]):((?:(?![OGDS]:)[^(])*)((?:\([^)]*\))*)/g)) {
      const [, part, head, aces] = m;
      if (part === 'O' || part === 'G') { out.push(`${part === 'O' ? 'Owner' : 'Group'}: ${trustee(head)}`); continue; }
      const title = part === 'D' ? 'DACL (who may access the object)' : 'SACL (what is audited, and integrity labels)';
      const control = (head.match(/NO_ACCESS_CONTROL|AR|AI|P/g) || []).map(c => CONTROL[c]);
      const list = [...aces.matchAll(/\(([^)]*)\)/g)].map((a, i) => ace(a[1], i + 1));
      out.push(`${title}${control.length ? `\n  ${control.join('; ')}` : ''}\n${list.length ? list.join('\n') : part === 'D' ? '  (empty: nobody is granted access)' : '  (empty)'}`);
    }
    if (!out.length) throw new Error('No SDDL components found');
    return out.join('\n\n');
  }, { text: true, aliases: ['sddl', 'security descriptor', 'acl', 'dacl', 'sacl', 'sc sdshow'] });
