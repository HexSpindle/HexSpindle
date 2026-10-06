const nameOf = x => x?.names?.en || x?.name || null;
const first = (...xs) => xs.find(v => v !== undefined && v !== null && v !== '') ?? null;
function compact(o) { return Object.fromEntries(Object.entries(o).filter(([, v]) => v !== undefined && v !== null && v !== '')); }

export function normalizeGeoIpRecord(record, db = {}) {
  if (!record || typeof record !== 'object') return {};
  const traits = record.traits || {};
  const countryObj = (record.country && typeof record.country === 'object') ? record.country : (record.registered_country || {});
  const subdivision = Array.isArray(record.subdivisions) ? record.subdivisions[record.subdivisions.length - 1] : null;
  const location = record.location || {};
  const asn = first(record.autonomous_system_number, traits.autonomous_system_number, record.asn, record.as_number, record.asn_number);
  const asOrg = first(record.autonomous_system_organization, traits.autonomous_system_organization, record.as_name, record.asn_name, record.as, record.organization, traits.organization);
  const lat = first(location.latitude, record.latitude, record.lat);
  const lon = first(location.longitude, record.longitude, record.lon, record.lng);
  return compact({
    country: first(nameOf(countryObj), record.country_name, typeof record.country === 'string' ? record.country : null, record.country_long),
    country_code: first(countryObj.iso_code, record.country_code, record.country_code2, record.country_short, record.country_short_name),
    continent: first(nameOf(record.continent), typeof record.continent === 'string' ? record.continent : null, record.continent_name),
    continent_code: first(record.continent?.code, record.continent_code),
    region: first(nameOf(subdivision), typeof record.region === 'string' ? record.region : null, record.region_name, record.subdivision),
    region_code: first(subdivision?.iso_code, record.region_code),
    city: first(nameOf(record.city), typeof record.city === 'string' ? record.city : null, record.city_name),
    postal_code: first(record.postal?.code, typeof record.postal === 'string' ? record.postal : null, record.zip_code, record.postal_code, record.zipcode),
    latitude: lat,
    longitude: lon,
    accuracy_radius_km: first(location.accuracy_radius, record.accuracy_radius, record.radius),
    timezone: first(location.time_zone, record.time_zone, record.timezone),
    asn: asn == null ? null : String(asn).replace(/^AS/i, ''),
    as_name: asOrg,
    as_domain: first(record.as_domain, traits.domain),
    isp: first(record.isp, traits.isp),
    domain: first(record.domain, traits.domain),
    connection_type: first(record.connection_type, traits.connection_type, record.usage_type),
    usage_type: first(record.usage_type, traits.user_type, record.as_usage_type),
    as_type: first(record.as_type, traits.user_type),
    proxy_type: first(record.proxy_type, record.proxyType),
    is_proxy: first(record.is_proxy, record.proxy),
    proxy_provider: first(record.provider, record.privacy_name),
    last_seen_days: first(record.last_seen, record.last_seen_days),
    threat: first(record.threat, record.threat_type),
    fraud_score: first(record.fraud_score, record.fraudScore),
    is_anonymous: first(record.is_anonymous, traits.is_anonymous),
    is_anycast: first(record.is_anycast, traits.is_anycast),
    is_hosting: first(record.is_hosting, record.is_hosting_provider, traits.is_hosting_provider),
    is_mobile: first(record.is_mobile, traits.is_mobile),
    is_satellite: first(record.is_satellite, traits.is_satellite_provider),
    is_relay: first(record.is_relay, traits.is_relay),
    is_vpn: first(record.is_vpn, record.is_anonymous_vpn, traits.is_anonymous_vpn),
    is_tor: first(record.is_tor, record.is_tor_exit_node, traits.is_tor_exit_node),
    is_anonymous_vpn: first(record.is_anonymous_vpn, traits.is_anonymous_vpn),
    is_hosting_provider: first(record.is_hosting_provider, traits.is_hosting_provider),
    is_public_proxy: first(record.is_public_proxy, traits.is_public_proxy),
    is_residential_proxy: first(record.is_residential_proxy, traits.is_residential_proxy),
    is_tor_exit_node: first(record.is_tor_exit_node, traits.is_tor_exit_node),
    provider: db.provider || null,
  });
}

export function extractIpTokens(text, isIp) {
  const tokens = String(text).split(/[\s,;]+/).map(s => s.trim().replace(/^\[|\]$/g, '')).filter(Boolean);
  const out = [], seen = new Set();
  for (const t of tokens) if (isIp(t) && !seen.has(t)) { seen.add(t); out.push(t); }
  return out;
}
