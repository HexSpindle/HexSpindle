import { module } from './_cat.js';
import { A } from '../../core/registry.js';
import { getServiceCredential } from '../../core/service-credentials.js';
import { OUTPUT_FORMATS, credentialConnection, enrichmentResult, fetchJson, mapIps, parallelIpOptions } from './_ip_enrichment.js';

const API = 'https://api.apivoid.com/v2';
const headers = key => ({ 'X-API-Key': key, Accept: 'application/json', 'Content-Type': 'application/json' });

async function testConnection(key) {
  if (!key.trim()) return { ok: false, message: 'API key is required.' };
  try {
    await fetchJson(`${API}/account-info`, { method: 'POST', headers: headers(key.trim()) });
    return { ok: true, message: 'Connected to APIVoid.' };
  } catch (error) { return { ok: false, message: error.message }; }
}

function parse(data) {
  const blacklists = data?.blacklists || {};
  const information = data?.information || {};
  const asn = data?.asn || {};
  const anonymity = data?.anonymity || {};
  const engines = Object.values(blacklists.engines || {});
  return {
    version: data?.version || '',
    risk_score: data?.risk_score?.result ?? 0,
    blacklist_detections: blacklists.detections ?? 0,
    blacklist_engines_count: blacklists.engines_count ?? 0,
    blacklist_detection_rate: blacklists.detection_rate ?? '0%',
    blacklist_detected_by: engines.filter(e => e?.detected).map(e => e?.name).filter(Boolean),
    reverse_dns: information.reverse_dns || '',
    continent_code: information.continent_code || '',
    continent_name: information.continent_name || '',
    country_code: information.country_code || '',
    country_name: information.country_name || '',
    region_name: information.region_name || '',
    city_name: information.city_name || '',
    latitude: information.latitude ?? '',
    longitude: information.longitude ?? '',
    isp: information.isp || '',
    information_asn: information.asn || '',
    cloud_provider: information.cloud_provider || '',
    is_public_dns: !!information.is_public_dns,
    is_bogon: !!information.is_bogon,
    asn: asn.asn || information.asn || '',
    as_name: asn.asname || '',
    as_route: asn.route || '',
    as_org: asn.org || '',
    as_country_code: asn.country_code || '',
    as_domain: asn.domain || '',
    as_abuse_email: asn.abuse_email || '',
    as_type: asn.type || '',
    rir: asn.rir || '',
    is_proxy: !!anonymity.is_proxy,
    is_webproxy: !!anonymity.is_webproxy,
    is_residential_proxy: !!anonymity.is_residential_proxy,
    is_vpn: !!anonymity.is_vpn,
    is_hosting: !!anonymity.is_hosting,
    is_relay: !!anonymity.is_relay,
    is_tor: !!anonymity.is_tor,
    elapsed_ms: data?.elapsed_ms ?? '',
  };
}

module(
  'APIVoid IP Reputation',
  'Check IPv4/IPv6 reputation with APIVoid v2, including blacklist detections, risk score, network/geographic metadata, ASN details, and anonymity signals. Uses your own APIVoid API key.',
  [
    A.select('Output', OUTPUT_FORMATS, 'JSON'),
    A.boolean('Disable reverse DNS', false),
    A.string('Exclude engines', '', 'Optional comma-separated APIVoid engine names'),
  ],
  async (input, output, disableReverseDns, excludeEngines) => {
    const key = getServiceCredential('apivoid').trim();
    if (!key) throw new Error('APIVoid API key is not configured');
    const rows = await mapIps(input, async ip => {
      const body = { ip, disable_reverse_dns: !!disableReverseDns };
      if (excludeEngines.trim()) body.exclude_engines = excludeEngines.trim();
      const { data } = await fetchJson(`${API}/ip-reputation`, {
        method: 'POST', headers: headers(key), body: JSON.stringify(body),
      });
      return parse(data || {});
    });
    return enrichmentResult('apivoid', rows, output);
  },
  {
    ...parallelIpOptions('apivoid'),
    aliases: ['API Void', 'IP blacklist', 'IP reputation'],
    connection: credentialConnection(
      'apivoid', 'APIVoid API key', testConnection,
      'Validation uses APIVoid Account Info and does not consume an IP Reputation credit. Stored only for this browser tab.'
    ),
  }
);
