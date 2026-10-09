// SPDX-License-Identifier: MIT
// HexSpindle SANS ISC IP lookups: cached bulk feeds or opt-in detailed API.
import { module } from './_cat.js';
import { A } from '../../core/registry.js';
import { OUTPUT_FORMATS, enrichmentResult, extractIps, fetchJson, mapIps, parallelIpOptions } from './_ip_enrichment.js';
import { getSansFeed, matchSansFeeds, feedMetadata } from './_sans_isc_feed.js';
import { installFeedStatusUI } from './_feed_status_ui.js';
installFeedStatusUI();

const SERVICE = 'sans_isc';
const API = 'https://isc.sans.edu/api';
const HEADERS = { Accept: 'application/json' };
const LOOKUP_MODES = ['Bulk (cached or download)', 'Bulk (cached only)', 'Live API (detailed)'];
const BULK_DATASETS = ['Intelfeed', 'Threatintel labels', 'Daily sources', 'All three'];
const IDS = ['intelfeed', 'threatintel', 'daily_sources'];

async function query(ip) {
  const { data } = await fetchJson(`${API}/ip/${encodeURIComponent(ip)}?json`, { headers: HEADERS });
  return data;
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

export async function lookupSansBulk(input, output = 'JSON', mode = LOOKUP_MODES[0], dataset = BULK_DATASETS[3]) {
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
  'Fast local IP matching against automatically synchronized same-origin SANS ISC/DShield feeds (one compressed download per updated dataset), or detailed opt-in per-IP live API lookups. See the latest sync dates directly below this description. Missing records do NOT mean the IP is benign. Attribution: SANS Technology Institute / ISC.',
  [A.select('Output', OUTPUT_FORMATS, 'JSON'), A.select('Lookup mode', LOOKUP_MODES, LOOKUP_MODES[0]), A.select('Bulk dataset', BULK_DATASETS, BULK_DATASETS[3])],
  lookupSansBulk,
  {
    ...parallelIpOptions(SERVICE),
    aliases: ['SANS', 'ISC', 'Internet Storm Center', 'DShield'],

  }
);
