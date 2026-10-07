import { module } from './_cat.js';
import { A } from '../../core/registry.js';
import { OUTPUT_FORMATS, enrichmentResult, fetchJson, mapIps, parallelIpOptions, publicConnection } from './_ip_enrichment.js';

const API = 'https://rdap-bootstrap.arin.net/bootstrap';
const HEADERS = { Accept: 'application/rdap+json, application/json' };

async function testConnection() {
  try {
    await fetchJson(`${API}/ip/8.8.8.8`, { headers: HEADERS });
    return { ok: true, message: 'Connected to the ARIN RDAP bootstrap service.' };
  } catch (error) { return { ok: false, message: error.message }; }
}

function vcardValues(vcardArray) {
  const result = { name: '', email: '' };
  const items = Array.isArray(vcardArray?.[1]) ? vcardArray[1] : [];
  for (const item of items) {
    if (!Array.isArray(item) || item.length < 4) continue;
    if ((item[0] === 'fn' || item[0] === 'org') && !result.name) {
      result.name = Array.isArray(item[3]) ? item[3].join(' ') : String(item[3] ?? '');
    }
    if (item[0] === 'email' && !result.email) result.email = String(item[3] ?? '');
  }
  return result;
}

function extractEntities(entities, out = { org_name: '', org_handle: '', abuse_contact: '', tech_contact: '', admin_contact: '' }) {
  for (const entity of Array.isArray(entities) ? entities : []) {
    const roles = entity?.roles || [];
    const handle = entity?.handle || '';
    const vcard = vcardValues(entity?.vcardArray);
    if (roles.includes('registrant')) {
      if (!out.org_name) out.org_name = vcard.name || entity?.name || '';
      if (!out.org_handle) out.org_handle = handle;
    }
    if (roles.includes('abuse') && !out.abuse_contact) out.abuse_contact = vcard.email || handle;
    if (roles.includes('technical') && !out.tech_contact) out.tech_contact = vcard.email || handle;
    if (roles.includes('administrative') && !out.admin_contact) out.admin_contact = vcard.email || handle;
    extractEntities(entity?.entities, out);
  }
  return out;
}

function extractCidrs(data) {
  const cidrs = [];
  for (const item of data?.cidr0_cidrs || []) {
    if (typeof item === 'string') cidrs.push(item);
    else if (item && typeof item === 'object') {
      const prefix = item.v4prefix || item.v6prefix;
      if (prefix && item.length != null) cidrs.push(`${prefix}/${item.length}`);
    }
  }
  if (!cidrs.length && data?.startAddress && data?.endAddress) cidrs.push(`${data.startAddress} - ${data.endAddress}`);
  if (data?.network && !cidrs.includes(data.network)) cidrs.push(data.network);
  return cidrs;
}

function parse(data) {
  const events = { registration_date: '', last_changed_date: '', expiration_date: '' };
  for (const event of data?.events || []) {
    if (event?.eventAction === 'registration') events.registration_date = event.eventDate || '';
    else if (event?.eventAction === 'last changed') events.last_changed_date = event.eventDate || '';
    else if (event?.eventAction === 'expiration') events.expiration_date = event.eventDate || '';
  }
  const remarks = [];
  for (const remark of data?.remarks || []) {
    if (remark?.title) remarks.push(`[${remark.title}]`);
    if (Array.isArray(remark?.description)) remarks.push(...remark.description);
    else if (remark?.description) remarks.push(String(remark.description));
  }
  const cidrs = extractCidrs(data);
  return {
    handle: data?.handle || '',
    name: data?.name || '',
    type: data?.type || '',
    parent_handle: data?.parentHandle || '',
    cidr_count: cidrs.length,
    cidrs,
    primary_cidr: cidrs[0] || '',
    ip_version: data?.ipVersion || '',
    start_address: data?.startAddress || '',
    end_address: data?.endAddress || '',
    country: data?.country || '',
    status: Array.isArray(data?.status) ? data.status.join('; ') : String(data?.status || ''),
    ...extractEntities(data?.entities),
    ...events,
    remarks: remarks.join(' | ').slice(0, 1000),
    whois_server: data?.port43 || '',
    object_class: data?.objectClassName || '',
  };
}

module(
  'ARIN RDAP',
  'Query RDAP for IPv4/IPv6 registration, network ranges, organization/contact roles, registry status, and registration/change events. Uses ARIN’s bootstrap service so non-ARIN address space is redirected to the appropriate authoritative RIR. No API key is required.',
  [A.select('Output', OUTPUT_FORMATS, 'JSON')],
  async (input, output) => {
    const rows = await mapIps(input, async ip => {
      const { data } = await fetchJson(`${API}/ip/${encodeURIComponent(ip)}`, { headers: HEADERS });
      return parse(data || {});
    });
    return enrichmentResult('arin_rdap', rows, output);
  },
  {
    ...parallelIpOptions('arin_rdap'),
    aliases: ['RDAP', 'ARIN', 'IP registration', 'WHOIS'],
    connection: publicConnection('arin_rdap', testConnection, 'No credentials required. The status checks direct browser connectivity to the ARIN RDAP bootstrap service.'),
  }
);
