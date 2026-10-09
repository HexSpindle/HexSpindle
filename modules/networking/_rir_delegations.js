// SPDX-License-Identifier: MIT
// Local IP allocation matching from all five Regional Internet Registries.
// This is NOT ARIN Bulk Whois, and does not carry contacts or reassignments.
import { parseIp } from './_mmdb.js';
import { feedManifest, getFeedInfo, readMirrorText, readMirrorCache, writeMirrorCache } from './_feed_mirror.js';

let hot = null, loading = null;
let ianaLoading = null;

function asNumber(raw) {
  if (raw.length === 4) return (raw[0]*16777216 + raw[1]*65536 + raw[2]*256 + raw[3]);
  let n = 0n;
  for (const b of raw) n = (n << 8n) + BigInt(b);
  return n;
}
function parseV4(s) {
  if (!/^\d{1,3}(?:\.\d{1,3}){3}$/.test(s)) return null;
  const a = s.split('.').map(Number);
  if (a.some(x => x > 255)) return null;
  return asNumber(a);
}
function parseV6(s) {
  const bytes = parseIp(s);
  return bytes?.length === 16 ? asNumber(bytes) : null;
}

export function parseDelegations(text) {
  const ipv4 = [], ipv6 = [];
  for (const line of String(text).split('\n')) {
    if (!line || line.startsWith('#')) continue;
    const [rir,country,type,start,value,date,status] = line.trim().split('|');
    if (!['arin','apnic','ripencc','lacnic','afrinic'].includes(rir) ||
        !['allocated','assigned'].includes(status) || !['ipv4','ipv6'].includes(type)) continue;
    if (type === 'ipv4') {
      const begin = parseV4(start), count = Number(value);
      if (begin == null || !Number.isInteger(count) || count<=0 || begin+count>2**32) continue;
      ipv4.push({ start:begin, end:begin+count-1, rir,country,date,status, range_size:count });
    } else {
      const begin = parseV6(start), prefix = Number(value);
      if (begin == null || !Number.isInteger(prefix) || prefix<0 || prefix>128) continue;
      const size = 1n << BigInt(128-prefix), mask = (1n<<128n)-size;
      if ((begin & mask) !== begin) continue;
      ipv6.push({ start:begin, end:begin+size-1n, rir,country,date,status, prefix });
    }
  }
  if (!ipv4.length && !ipv6.length) throw new Error('RIR allocation feed contains no valid IP ranges');
  // Prefix maxima let us find overlapping registrations without assuming ranges
  // are disjoint or IPv4 delegated counts are always powers of two.
  for (const list of [ipv4, ipv6]) {
    list.sort((a,b) => a.start < b.start ? -1 : a.start > b.start ? 1 : (a.end < b.end ? -1 : a.end > b.end ? 1 : 0));
    let max = list.length ? list[0].end : 0;
    for (const entry of list) {
      if (entry.end > max) max=entry.end;
      entry.prefixMaxEnd=max;
    }
  }
  return { ipv4, ipv6 };
}

function findOne(list, needle) {
  let low=0, high=list.length;
  while (low<high) {
    const mid=(low+high)>>>1;
    if (list[mid].start<=needle) low=mid+1; else high=mid;
  }
  let best=null;
  for (let i=low-1; i>=0 && list[i].prefixMaxEnd>=needle; i--) {
    const row=list[i];
    if (row.end<needle) continue;
    if (!best || (row.end-row.start)<(best.end-best.start)) best=row;
  }
  return best;
}
function v4ToString(x) {
  return [24,16,8,0].map(n=>Math.floor(x/2**n)%256).join('.');
}
function v6ToString(n) {
  let groups=[];
  for (let i=7;i>=0;i--) groups.push(Number((n >> BigInt(i*16))&65535n).toString(16));
  return groups.join(':');
}
export function matchDelegation(ip, index) {
  const raw = parseIp(ip);
  if (!raw) return { ip, found: false, error: 'Invalid IP address' };
  const row = findOne(raw.length===4?index.ipv4:index.ipv6,asNumber(raw));
  if (!row) return { ip, found: false, source: 'RIR extended delegation statistics', allocation_found: false };
  const format = raw.length===4?v4ToString:v6ToString;
  return {
    ip, found: true, allocation_found:true, rir:row.rir.toUpperCase(), allocation_country_code:row.country,
    allocation_status:row.status, allocation_date:row.date, allocation_start:format(row.start),
    allocation_end:format(row.end),
    ...(raw.length===4?{allocation_address_count:row.range_size}:{allocation_prefix_length:row.prefix}),
    source: 'RIR extended delegation statistics', detail_available_locally: false,
  };
}

async function loadInternal() {
  const cached = await readMirrorCache('rir_delegations');
  const reviveStored = (stale = false, message = null) => {
    if (!cached?.text || !cached.version) return null;
    const index=parseDelegations(cached.text);
    hot={ ...index, version:cached.version, storedAt:cached.storedAt,
      sourceRetrievedAt:cached.sourceRetrievedAt || null,
      publishedAt:cached.publishedAt || null, persistent:true,
      ...(stale?{stale:true,refreshError:message}:{}) };
    return hot;
  };
  let manifest;
  try { manifest=await feedManifest(); }
  catch (error) {
    if (hot) return {...hot,stale:true,refreshError:error.message};
    const old=reviveStored(true,error.message);if(old) return old;
    throw error;
  }
  const info=getFeedInfo(manifest,'rir_delegations');
  if (hot?.version===info.sha256) return hot;
  if (cached?.version===info.sha256) return reviveStored();
  try {
    const {text}=await readMirrorText('rir_delegations',manifest,100*1024*1024);
    const index=parseDelegations(text);
    const storedAt=Date.now();
    const persistent=await writeMirrorCache('rir_delegations',{text,version:info.sha256,
      storedAt,sourceRetrievedAt:info.source_retrieved_at,publishedAt:manifest.generated_at});
    hot={...index,version:info.sha256,publishedAt:manifest.generated_at,
      sourceRetrievedAt:info.source_retrieved_at,storedAt,persistent};
    return hot;
  } catch (error) {
    if (hot) return {...hot,stale:true,refreshError:error.message};
    const old=reviveStored(true,error.message); if(old) return old;
    throw error;
  }
}

export function getRirIndex() {
  if (loading) return loading;
  loading=loadInternal().finally(()=>{loading=null;});
  return loading;
}

function asCidr(value) {
  const [addr,prefixStr]=value.split('/');
  const raw=parseIp(addr), prefix=Number(prefixStr);
  if (!raw || !Number.isInteger(prefix) || prefix<0 || prefix>raw.length*8) return null;
  const bits=BigInt(raw.length*8), shift=bits-BigInt(prefix);
  const start=BigInt(asNumber(raw)) >> shift << shift;
  const end=start + (1n << shift)-1n;
  return {start,end,ipVersion:raw.length===4?4:6,prefix};
}
export function parseIanaServices(services) {
  let ranges=[];
  for (const item of services||[]) {
    if (!Array.isArray(item) || !Array.isArray(item[0]) || !Array.isArray(item[1])) continue;
    const urls=item[1].filter(u=>/^https:\/\//.test(u));
    for (const prefix of item[0]) {
      const range=asCidr(prefix);
      if (range) ranges.push({...range,registry_urls:urls});
    }
  }
  return ranges;
}
export function matchIana(ip, ranges) {
  const raw=parseIp(ip);if (!raw) return null;
  const point=BigInt(asNumber(raw)); let best=null;
  for (const r of ranges) if (r.ipVersion===(raw.length===4?4:6) && r.start<=point && r.end>=point && (!best || r.prefix>best.prefix)) best=r;
  return best ? { authoritative_rdap:best.registry_urls[0]||null, iana_prefix_length:best.prefix } : null;
}
async function fetchIana() {
  const manifest=await feedManifest();
  const both=await Promise.all(['iana_ipv4','iana_ipv6'].map(k=>readMirrorText(k,manifest,10_000_000)));
  return parseIanaServices(both.flatMap(({text})=>JSON.parse(text).services||[]));
}
export function getIanaIndex() {
  if (!ianaLoading) ianaLoading=fetchIana().catch(e=>{ianaLoading=null;throw e;});
  return ianaLoading;
}
export async function lookupLocalAllocations(input, ips) {
  const index=await getRirIndex();
  const iana=await getIanaIndex().catch(()=>[]);
  return ips.map(ip=>({ ...matchDelegation(ip,index), ...(matchIana(ip,iana)||{}),
    source_synced_at:index.sourceRetrievedAt, source_published_at:index.publishedAt,
    ...(index.stale?{stale:true,refresh_error:index.refreshError}:{}) }));
}
export async function rirStatus() {
  const manifest=await feedManifest();
  const info=getFeedInfo(manifest,'rir_delegations');
  const c=await readMirrorCache('rir_delegations');
  return { source_retrieved_at: info.source_retrieved_at, source_files:info.sources,
    source_published_at: manifest.generated_at, records:info.records,
    browser_cached_at:hot?.storedAt?new Date(hot.storedAt).toISOString():c?.storedAt?new Date(c.storedAt).toISOString():null,
    cached:!!hot||!!c, raw_bytes:info.raw_bytes, compressed_bytes:info.compressed_bytes,sha256:info.sha256 };
}
