import { module } from './_cat.js';
import { A } from '../../core/registry.js';
import { getServiceCredential } from '../../core/service-credentials.js';
import { OUTPUT_FORMATS, credentialConnection, enrichmentResult, epochIso, fetchJson, mapIps, parallelIpOptions } from './_ip_enrichment.js';

const API = 'https://www.virustotal.com/api/v3';
const headers = key => ({ 'x-apikey': key, Accept: 'application/json' });

async function testConnection(key) {
  if (!key.trim()) return { ok: false, message: 'API key is required.' };
  try {
    // A real report lookup is the most reliable way to validate both the key
    // and browser connectivity. This request can count against API quota.
    await fetchJson(`${API}/ip_addresses/8.8.8.8`, { headers: headers(key.trim()) });
    return { ok: true, message: 'Connected to VirusTotal.' };
  } catch (error) {
    return { ok: false, message: error.message };
  }
}

function parse(attributes, detectedLimit) {
  const stats = attributes?.last_analysis_stats || {};
  const malicious = Number(stats.malicious || 0), suspicious = Number(stats.suspicious || 0);
  const total = Object.values(stats).reduce((n, v) => n + (Number(v) || 0), 0);
  const detected = [];
  for (const [engine, value] of Object.entries(attributes?.last_analysis_results || {})) {
    if (value?.category === 'malicious' || value?.category === 'suspicious') {
      detected.push({ engine, category: value.category, result: value.result || '' });
      if (detected.length >= detectedLimit) break;
    }
  }
  return {
    malicious_count: malicious,
    suspicious_count: suspicious,
    harmless_count: Number(stats.harmless || 0),
    undetected_count: Number(stats.undetected || 0),
    timeout_count: Number(stats.timeout || 0),
    total_engines: total,
    detection_rate: total ? `${((malicious + suspicious) / total * 100).toFixed(1)}%` : '0%',
    reputation: attributes?.reputation ?? 0,
    asn: attributes?.asn ?? '',
    as_owner: attributes?.as_owner ?? '',
    country: attributes?.country ?? '',
    continent: attributes?.continent ?? '',
    network: attributes?.network ?? '',
    regional_internet_registry: attributes?.regional_internet_registry ?? '',
    whois: String(attributes?.whois || '').slice(0, 1000),
    whois_date: epochIso(attributes?.whois_date),
    last_analysis_date: epochIso(attributes?.last_analysis_date),
    last_modification_date: epochIso(attributes?.last_modification_date),
    tags: attributes?.tags || [],
    detected_engines: detected,
    votes_harmless: Number(attributes?.total_votes?.harmless || 0),
    votes_malicious: Number(attributes?.total_votes?.malicious || 0),
  };
}

module(
  'VirusTotal IP',
  'Enrich IPv4/IPv6 addresses with VirusTotal reputation, detection statistics, ASN/network metadata, tags, WHOIS, and community votes. Uses your own VirusTotal API key. Querying an IP may make that indicator visible to VirusTotal.',
  [
    A.select('Output', OUTPUT_FORMATS, 'JSON'),
    A.number('Detected engines limit', 10, 0, 50, 1),
  ],
  async (input, output, detectedLimit) => {
    const key = getServiceCredential('virustotal').trim();
    if (!key) throw new Error('VirusTotal API key is not configured');
    const rows = await mapIps(input, async ip => {
      const { data } = await fetchJson(`${API}/ip_addresses/${encodeURIComponent(ip)}`, { headers: headers(key) });
      return parse(data?.data?.attributes || {}, Math.max(0, Number(detectedLimit) || 0));
    });
    return enrichmentResult('virustotal', rows, output);
  },
  {
    ...parallelIpOptions('virustotal'),
    aliases: ['VT IP', 'VirusTotal', 'IP reputation'],
    connection: credentialConnection(
      'virustotal',
      'VirusTotal API key',
      testConnection,
      'Validation performs one IP report lookup and may count against VirusTotal API quota. Stored only for this browser tab; never included in recipe exports or shared links.'
    ),
  }
);
