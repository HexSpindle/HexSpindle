// SPDX-License-Identifier: MIT
// HexSpindle: render published source dates inline in the two recipe operation cards.
// Standalone status operations / network connection buttons are intentionally absent.
// This is a read-only display of the manifest; it never downloads feed datasets.
import { feedManifest } from './_feed_mirror.js';

const PROVIDERS = Object.freeze({
  'SANS ISC IP': [
    ['Intelfeed', 'sans_intelfeed'],
    ['Threat intelligence', 'sans_threatintel'],
    ['Daily sources', 'sans_daily_sources'],
  ],
  'IPInfo.io Basic': [['IPinfo Lite (optional)', 'ipinfo_lite']],
  'IP GeoLocation': [['GeoLite2-City.mmdb (optional public copy)', 'maxmind_geolite2_city']],
  'ThreatFox IOC Lookup': [['ThreatFox IOC export', 'abusech_threatfox']],
  'URLhaus URL Lookup': [['URLhaus recent URL export', 'abusech_urlhaus']],
  'ARIN RDAP': [
    ['ARIN', 'arin'], ['APNIC', 'apnic'], ['RIPE NCC', 'ripencc'],
    ['LACNIC', 'lacnic'], ['AFRINIC', 'afrinic'],
    ['IANA IPv4', 'iana_ipv4'], ['IANA IPv6', 'iana_ipv6'],
  ],
});
let installed = false;
let currentManifest = null;
let currentError = '';
let inflight = null;

export function utcDate(value) {
  const timestamp = Date.parse(value || '');
  if (!Number.isFinite(timestamp)) return 'Not reported';
  return new Intl.DateTimeFormat('en-GB', {
    year: 'numeric', month: 'short', day: '2-digit', hour: '2-digit',
    minute: '2-digit', timeZone: 'UTC', timeZoneName: 'short', hour12: false,
  }).format(timestamp);
}

export function statusRows(manifest, operationName) {
  const defs = PROVIDERS[operationName] || [];
  const dataset = manifest?.datasets || {};
  const sources = dataset.rir_delegations?.sources || {};
  return defs.map(([label, key]) => {
    const data = Object.prototype.hasOwnProperty.call(sources, key) ? sources[key] : dataset[key];
    return {
      label,
      retrieved_at: data?.source_retrieved_at || null,
      database_name: data?.database_name || null,
      database_updated_date: data?.database_updated_date || null,
      database_type: data?.database_type || null,
      mmdb_format_version: data?.mmdb_format_version || null,
      modified_at: data?.source_modified_at || null,
      records: Number.isInteger(data?.records) ? data.records : null,
      unavailable_reason: manifest?.unavailable?.[key] || null,
    };
  });
}

function element(tag, text, css = '') {
  const node = document.createElement(tag);
  if (text != null) node.textContent = text;
  if (css) node.style.cssText = css;
  return node;
}
function paint(panel) {
  panel.replaceChildren();
  const title = element('div', 'Feed synchronization', 'font-weight:600;margin-bottom:4px;');
  panel.append(title);
  if (currentError) {
    panel.append(element('div', `Sync metadata unavailable: ${currentError}`,
      'color:var(--dim,#94a3b8);overflow-wrap:anywhere;'));
    return;
  }
  if (!currentManifest) {
    panel.append(element('div', 'Loading published feed dates…', 'color:var(--dim,#94a3b8);'));
    return;
  }
  const published = element('div', `Last published: ${utcDate(currentManifest.generated_at)}`,
    'color:var(--dim,#94a3b8);margin-bottom:5px;');
  panel.append(published);
  for (const row of statusRows(currentManifest, panel.dataset.provider)) {
    const item = element('div', '', 'display:flex;justify-content:space-between;gap:8px;flex-wrap:wrap;margin-top:3px;');
    item.append(element('span', row.database_name || row.label), element('span',
      row.database_updated_date ? `Updated: ${row.database_updated_date}` :
      row.retrieved_at ? utcDate(row.retrieved_at) : (row.unavailable_reason || 'Not synchronized'),
      'color:var(--dim,#94a3b8);font-variant-numeric:tabular-nums;'));
    if (row.modified_at) item.title = `Upstream Last-Modified: ${utcDate(row.modified_at)}`;
    if (row.database_updated_date) item.title = `MMDB database build: ${row.database_updated_date}; fetched: ${utcDate(row.retrieved_at)}`;
    panel.append(item);
  }
  if (panel.dataset.provider === 'IP GeoLocation') {
    panel.append(element('div', 'User-provided MMDB files always remain supported and take priority. Public GeoLite2 City requires redistribution permission. The displayed update date comes from MMDB build metadata, not the download date.',
      'color:var(--dim,#94a3b8);font-size:11px;margin-top:6px;'));
    const attribution = document.createElement('a');
    attribution.href = 'https://www.maxmind.com';
    attribution.target = '_blank';
    attribution.rel = 'noopener noreferrer';
    attribution.textContent = 'GeoLite2 data created by MaxMind, available from MaxMind';
    attribution.style.cssText = 'display:inline-block;margin-top:6px;color:var(--accent,#36a7ff);font-size:11px;';
    panel.append(attribution);
  }
  if (panel.dataset.provider === 'IPInfo.io Basic') {
    const attribution = document.createElement('a');
    attribution.href = 'https://ipinfo.io';
    attribution.target = '_blank';
    attribution.rel = 'noopener noreferrer';
    attribution.textContent = 'IP address data powered by IPinfo (CC BY-SA 4.0)';
    attribution.style.cssText = 'display:inline-block;margin-top:6px;color:var(--accent,#36a7ff);font-size:11px;';
    panel.append(attribution);
  }
  panel.append(element('div', 'Times are actual successful retrievals (UTC), not the scheduled job time.',
    'font-size:11px;color:var(--dim,#94a3b8);margin-top:7px;'));
}

function refresh(force = false) {
  if (inflight) return inflight;
  inflight = (async () => {
    try {
      currentManifest = await feedManifest(force);
      currentError = '';
    } catch (err) {
      // Do not erase the previously confirmed snapshot on a transient error.
      if (!currentManifest) currentError = err?.message || String(err);
    }
    if (typeof document !== 'undefined') {
      document.querySelectorAll('#recipeList .hex-feed-status-inline').forEach(paint);
    }
  })().finally(() => { inflight = null; });
  return inflight;
}

function mount() {
  const root = document.getElementById('recipeList');
  if (!root) return;
  let newPanel = false;
  for (const card of root.children) {
    if (!card.classList?.contains('step')) continue;
    const title = card.querySelector('.step-h .title')?.textContent?.trim();
    if (!PROVIDERS[title] || card.querySelector('.hex-feed-status-inline')) continue;
    const details = card.querySelector('.step-b');
    if (!details) continue;
    const panel = element('div', null,
      'border:1px solid var(--line,#334155);border-radius:9px;padding:9px 11px;margin:9px 0;' +
      'font-size:12px;line-height:1.5;min-width:0;overflow-wrap:anywhere;');
    panel.className = 'hex-feed-status-inline';
    panel.dataset.provider = title;
    panel.setAttribute('role', 'status');
    panel.setAttribute('aria-label', `${title} feed update dates`);
    const desc = details.querySelector('.desc');
    if (desc) desc.after(panel);
    else details.prepend(panel);
    paint(panel);
    newPanel = true;
  }
  if (newPanel) refresh();
}

export function installFeedStatusUI() {
  if (installed || typeof document === 'undefined' || typeof MutationObserver === 'undefined') return;
  installed = true;
  const setup = () => {
    const root = document.getElementById('recipeList');
    if (!root) return;
    const watcher = new MutationObserver(mount);
    // App's renderRecipe replaces/adds direct children; nested status updates won't retrigger.
    watcher.observe(root, { childList: true });
    mount();
    // Occasionally refresh the small JSON manifest while the recipe is open.
    setInterval(() => {
      if (root.querySelector('.hex-feed-status-inline')) refresh(true);
    }, 5 * 60 * 1000);
  };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', setup, { once: true });
  else setup();
}
