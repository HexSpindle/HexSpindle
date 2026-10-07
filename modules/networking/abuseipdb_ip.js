import { module } from './_cat.js';
import { A } from '../../core/registry.js';
import { parseIndicators, mapLimit, fetchJson, providerResult, mergeProvider, requireValue } from './_intel_common.js';

const SERVICE = 'abuseipdb';
const BASE = 'https://api.abuseipdb.com/api/v2/check';

export async function testAbuseIPDB(apiKey) {
  apiKey = requireValue(apiKey, 'AbuseIPDB API key');
  await fetchJson(`${BASE}?ipAddress=8.8.8.8&maxAgeInDays=90`, { headers: { Key: apiKey, Accept: 'application/json' } }, 12000);
  return true;
}

module('AbuseIPDB IP Lookup',
  'Enrich IPv4/IPv6 indicators with AbuseIPDB confidence score, report counts, usage type, ISP/domain and network context. Uses your AbuseIPDB API key.',
  [A.secret('API key', SERVICE, '', 'AbuseIPDB API v2 key'), A.number('Max age (days)', 90, 1, 365, 1), A.boolean('Verbose reports', false), A.number('Concurrency', 2, 1, 5, 1)],
  async (input, apiKey, maxAge, verbose, concurrency) => {
    apiKey = requireValue(apiKey, 'AbuseIPDB API key');
    const ips = parseIndicators(input);
    const rows = await mapLimit(ips, concurrency, async ip => {
      try {
        const q = new URLSearchParams({ ipAddress: ip, maxAgeInDays: String(maxAge) });
        if (verbose) q.set('verbose', '');
        const { body } = await fetchJson(`${BASE}?${q}`, { headers: { Key: apiKey, Accept: 'application/json' } });
        const d = body?.data || {};
        return providerResult(SERVICE, ip, {
          abuse_confidence_score: d.abuseConfidenceScore ?? 0, total_reports: d.totalReports ?? 0,
          num_distinct_users: d.numDistinctUsers ?? 0, last_reported_at: d.lastReportedAt ?? '',
          is_public: d.isPublic ?? null, ip_version: d.ipVersion ?? '', is_whitelisted: d.isWhitelisted ?? null,
          country_code: d.countryCode ?? '', usage_type: d.usageType ?? '', isp: d.isp ?? '',
          domain: d.domain ?? '', hostnames: d.hostnames || [], reports: verbose ? (d.reports || []) : undefined
        });
      } catch (e) { return providerResult(SERVICE, ip, null, e.message); }
    });
    return mergeProvider(input, SERVICE, rows);
  },
  { net: true, parallelSafe: true, mergeStrategy: 'indicator', credentialService: SERVICE });
