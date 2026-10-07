import { module } from './_cat.js';
import { A } from '../../core/registry.js';
import { OUTPUT_FORMATS, enrichmentResult, fetchJson, mapIps, parallelIpOptions, publicConnection, pruneEmpty } from './_ip_enrichment.js';

const SERVICE = 'crt_sh';
const API = 'https://crt.sh/';

async function query(ip) {
  const { data } = await fetchJson(`${API}?q=${encodeURIComponent(ip)}&output=json`, { headers: { Accept: 'application/json' } }, 30000);
  return Array.isArray(data) ? data : [];
}

function exactNameHit(record, ip) {
  const names = [record?.common_name, ...String(record?.name_value || '').split(/\r?\n/)].filter(Boolean);
  return names.some(name => String(name).trim().replace(/^\*\./, '') === ip);
}

function parse(records, ip, maxRecords) {
  const exact = records.filter(r => exactNameHit(r, ip));
  const names = [...new Set(exact.flatMap(r => [r?.common_name, ...String(r?.name_value || '').split(/\r?\n/)]).filter(Boolean))];
  const issuers = [...new Set(exact.map(r => r?.issuer_name).filter(Boolean))];
  const certificates = exact.slice(0, maxRecords).map(r => pruneEmpty({
    id: r?.id || r?.min_cert_id,
    common_name: r?.common_name,
    name_value: r?.name_value,
    issuer_name: r?.issuer_name,
    entry_timestamp: r?.entry_timestamp || r?.min_entry_timestamp,
    not_before: r?.not_before,
    not_after: r?.not_after,
    serial_number: r?.serial_number,
  })).filter(Boolean);
  return pruneEmpty({ certificate_count: exact.length, names, issuers, certificates });
}

export async function testCrtShConnection() {
  try { await query('8.8.8.8'); return { ok: true, message: 'Connected to crt.sh.' }; }
  catch (error) { return { ok: false, message: error?.message || String(error) }; }
}

module(
  'Certificate Transparency (crt.sh)',
  'Search crt.sh Certificate Transparency records for certificates whose Common Name or SAN exactly contains the input IP. No API key is required. Direct browser access is best-effort because crt.sh may change CORS or rate-limit behavior.',
  [A.number('Max certificate records', 10, 1, 50, 1), A.select('Output', OUTPUT_FORMATS, 'JSON')],
  async (input, maxRecords, output) => enrichmentResult(SERVICE,
    await mapIps(input, async ip => parse(await query(ip), ip, Math.max(1, Math.min(50, maxRecords | 0)))), output),
  {
    ...parallelIpOptions(SERVICE),
    aliases: ['crt.sh', 'Certificate Transparency', 'CT logs'],
    connection: publicConnection(SERVICE, testCrtShConnection, 'No API key required. Browser CORS availability is controlled by crt.sh.'),
  }
);
