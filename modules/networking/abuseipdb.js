import { module } from './_cat.js';
import { A } from '../../core/registry.js';
import { getServiceCredential } from '../../core/service-credentials.js';
import { OUTPUT_FORMATS, credentialConnection, enrichmentResult, fetchJson, mapIps, parallelIpOptions } from './_ip_enrichment.js';

const API = 'https://api.abuseipdb.com/api/v2';
const headers = key => ({ Key: key, Accept: 'application/json' });

async function query(key, ip, maxAge = 90, verbose = false) {
  const url = new URL(`${API}/check`);
  url.searchParams.set('ipAddress', ip);
  url.searchParams.set('maxAgeInDays', String(maxAge));
  if (verbose) url.searchParams.set('verbose', '');
  const { data } = await fetchJson(url.toString(), { headers: headers(key) });
  return data?.data || {};
}

async function testConnection(key) {
  if (!key.trim()) return { ok: false, message: 'API key is required.' };
  try {
    await query(key.trim(), '8.8.8.8', 1, false);
    return { ok: true, message: 'Connected to AbuseIPDB.' };
  } catch (error) { return { ok: false, message: error.message }; }
}

function parse(data, includeReports) {
  const row = {
    is_public: data.isPublic ?? '',
    ip_version: data.ipVersion ?? '',
    is_whitelisted: data.isWhitelisted ?? '',
    abuse_confidence_score: data.abuseConfidenceScore ?? 0,
    country_code: data.countryCode || '',
    usage_type: data.usageType || '',
    isp: data.isp || '',
    domain: data.domain || '',
    hostnames: data.hostnames || [],
    is_tor: data.isTor ?? false,
    total_reports: data.totalReports ?? 0,
    distinct_users: data.numDistinctUsers ?? 0,
    last_reported_at: data.lastReportedAt || '',
  };
  if (includeReports && Array.isArray(data.reports)) row.reports = data.reports;
  return row;
}

module(
  'AbuseIPDB IP Check',
  'Check IPv4/IPv6 addresses against AbuseIPDB for abuse confidence, reporting history, ISP/domain metadata, Tor status, and related reputation fields. Uses your own AbuseIPDB API key.',
  [
    A.select('Output', OUTPUT_FORMATS, 'JSON'),
    A.number('Max age (days)', 90, 1, 365, 1),
    A.boolean('Include reports (verbose)', false),
  ],
  async (input, output, maxAge, verbose) => {
    const key = getServiceCredential('abuseipdb').trim();
    if (!key) throw new Error('AbuseIPDB API key is not configured');
    const age = Math.max(1, Math.min(365, Number(maxAge) || 90));
    const rows = await mapIps(input, async ip => parse(await query(key, ip, age, !!verbose), !!verbose));
    return enrichmentResult('abuseipdb', rows, output);
  },
  {
    ...parallelIpOptions('abuseipdb'),
    aliases: ['AbuseIPDB', 'Abuse IP', 'IP abuse'],
    connection: credentialConnection(
      'abuseipdb', 'AbuseIPDB API key', testConnection,
      'Validation performs one lightweight check against 8.8.8.8 and may count toward your AbuseIPDB request quota. Stored only for this browser tab.'
    ),
  }
);
