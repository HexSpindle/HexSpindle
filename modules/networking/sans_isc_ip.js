// SPDX-License-Identifier: MIT
// HexSpindle SANS ISC IP lookups: cached bulk feeds or opt-in detailed API.
import { module } from './_cat.js';
import { A } from '../../core/registry.js';
import { OUTPUT_FORMATS, enrichmentResult, extractIps, fetchJson, mapIps, parallelIpOptions, publicConnection } from './_ip_enrichment.js';
import { SANS_FEEDS, SANS_ATTRIBUTION, importSansFeed, getSansFeed, matchSansFeeds, feedMetadata } from './_sans_isc_feed.js';

const SERVICE = 'sans_isc';
const API = 'https://isc.sans.edu/api';
const HEADERS = { Accept: 'application/json' };
const LOOKUP_MODES = ['Bulk (cached or download)', 'Bulk (cached only)', 'Live API (detailed)'];
const BULK_DATASETS = ['Intelfeed', 'Threatintel labels', 'Daily sources', 'All three'];
const IMPORT_DATASETS = ['Intelfeed JSON', 'Threatintel text', 'Daily sources TSV'];
const IDS = ['intelfeed', 'threatintel', 'daily_sources'];

async function query(ip) {
  const { data } = await fetchJson(`${API}/ip/${encodeURIComponent(ip)}?json`, { headers: HEADERS });
  return data;
}
export async function testSANSISCConnection() {
  try { await query('8.8.8.8'); return { ok: true, message: 'Connected to SANS ISC live API (bulk feed availability is separate).' }; }
  catch (error) { return { ok: false, message: error?.message || String(error) }; }
}
const numeric = value => value === null || value === undefined || value === '' ? undefined : Number(value);
function parseLive(payload) {
  const data = payload && typeof payload === 'object' ? (payload.ip || payload) : {};
  const feeds = data?.threatfeeds;
  const feedNames = feeds && typeof feeds === 'object' && !Array.isArray(feeds) ? Object.keys(feeds) : [];
  return {
    number: data?.number, country: data?.country, count: numeric(data?.count), attacks: numeric(data?.attacks),
    maxdate: data?.maxdate, mindate: data?.mindate, updated: data?.updated, comment: data?.comment,
    maxrisk: data?.maxrisk, abuse_contact: data?.abusecontact || data?.asabusecontact, asn: data?.as,
    as_name: data?.asname, as_country: data?.ascountry, as_size: data?.assize, network: data?.network,
    threatfeed_count: feeds == null ? undefined : feedNames.length, threatfeed_names: feedNames, threatfeeds: feeds,
  };
}

export async function lookupSansBulk(input, output = 'JSON', mode = LOOKUP_MODES[0], dataset = BULK_DATASETS[0]) {
  if (mode === LOOKUP_MODES[2]) return enrichmentResult(SERVICE,
    await mapIps(input, async ip => parseLive(await query(ip))), output);
  const selected = dataset === BULK_DATASETS[3] ? IDS : [IDS[BULK_DATASETS.indexOf(dataset)] || IDS[0]];
  const feedMode = mode === LOOKUP_MODES[1] ? 'offline' : 'auto';
  // One download per dataset, NEVER one download per IP.
  const feeds = await Promise.all(selected.map(kind => getSansFeed(kind, feedMode)));
  const ips = extractIps(input);
  const provenance = feedMetadata(feeds);
  const rows = ips.map(ip => ({ ...matchSansFeeds(ip, feeds), dataset_metadata: provenance }));
  return enrichmentResult(SERVICE, rows, output);
}

module(
  'SANS ISC IP',
  'Fast batch lookup against cached SANS ISC/DShield daily feeds (one download per dataset, local matching for every IP), or detailed per-IP live API lookups. Bulk data is not the same as the full IP API and a missing match does NOT mean an IP is safe. Attribution: SANS Technology Institute, Internet Storm Center (isc.sans.edu). Direct remote download requires CORS; if blocked, use SANS ISC Import Feed.',
  [A.select('Output', OUTPUT_FORMATS, 'JSON'), A.select('Lookup mode', LOOKUP_MODES, LOOKUP_MODES[0]), A.select('Bulk dataset', BULK_DATASETS, BULK_DATASETS[0])],
  lookupSansBulk,
  {
    ...parallelIpOptions(SERVICE),
    aliases: ['SANS', 'ISC', 'Internet Storm Center', 'DShield'],
    connection: publicConnection(SERVICE, testSANSISCConnection,
      'Test connection checks the LIVE SANS ISC API, not bulk feed CORS. Bulk feeds may require local import when hosted on GitHub Pages.'),
  }
);

// Deliberately registered in the existing SANS module: no modules/index.js modification.
// Workflow: Open downloaded feed as the main INPUT file, select its type and run this once.
// Then put the IP list back in INPUT and run SANS ISC IP in a Bulk lookup mode.
module(
  'SANS ISC Import Feed',
  'Import one downloaded SANS ISC/DShield bulk feed into an indexed in-browser database. Open a downloaded Intelfeed JSON, threatintel.txt or daily_sources as HexSpindle INPUT first. Choose the matching type. Keeps a reusable IndexedDB cache if the browser permits it. Never redistributes SANS data.',
  [A.select('Feed type', IMPORT_DATASETS, IMPORT_DATASETS[0])],
  async (input, type) => {
    const kind = IDS[IMPORT_DATASETS.indexOf(type)] || 'intelfeed';
    // Input remains binary to support large feed files and non-UTF8 garbage detection.
    if (!(input instanceof Uint8Array)) throw new Error('Open the downloaded feed as a HexSpindle input file.');
    const result = await importSansFeed(kind, input);
    return JSON.stringify({ status: 'imported', ...result, how_to_use: 'Replace INPUT with your IP list, remove the Import operation, add SANS ISC IP and choose Bulk (cached only). A missing match does not mean an IP is benign.', licenses: 'See https://isc.sans.edu/feeds_doc.html', attribution: SANS_ATTRIBUTION }, null, 2);
  },
  { text: false, aliases: ['Import SANS', 'DShield feed import', 'SANS bulk import'] }
);
