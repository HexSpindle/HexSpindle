export function maxBits(version) { return version === 4 ? 32 : 128; }

function parseOctet(s) {
  if (!s) throw new Error('Empty octet not permitted');
  if (!/^[0-9]+$/.test(s)) throw new Error(`Only decimal digits permitted in '${s}'`);
  if (s.length > 3) throw new Error(`At most 3 characters permitted in '${s}'`);
  if (s !== '0' && s[0] === '0') throw new Error(`Leading zeros are not permitted in '${s}'`);
  const n = parseInt(s, 10);
  if (n > 255) throw new Error(`Octet ${n} (> 255) not permitted`);
  return n;
}

export function parseIPv4(s) {
  if (!s) throw new Error('Address cannot be empty');
  const octets = s.split('.');
  if (octets.length !== 4) throw new Error(`Expected 4 octets in '${s}'`);
  let v = 0n;
  for (const o of octets) v = (v << 8n) | BigInt(parseOctet(o));
  return v;
}

export function ipv4ToStr(v) {
  v = BigInt(v);
  return [24n, 16n, 8n, 0n].map(sh => Number((v >> sh) & 0xffn)).join('.');
}

function parseHextet(s) {
  if (!/^[0-9a-fA-F]+$/.test(s)) throw new Error(`Only hex digits permitted in '${s}'`);
  if (s.length > 4) throw new Error(`At most 4 characters permitted in '${s}'`);
  return parseInt(s, 16);
}

function parseIPv6Str(ipStr) {
  if (!ipStr) throw new Error('Address cannot be empty');
  if (ipStr.length > 45) throw new Error('Address too long');
  let parts = ipStr.split(':');
  if (parts.length < 3) throw new Error(`At least 3 parts expected in '${ipStr}'`);
  if (parts[parts.length - 1].includes('.')) {
    const v4 = parseIPv4(parts.pop());
    parts.push(((v4 >> 16n) & 0xffffn).toString(16));
    parts.push((v4 & 0xffffn).toString(16));
  }
  if (parts.length > 9) throw new Error(`At most 8 colons permitted in '${ipStr}'`);
  let skipIndex = null;
  for (let i = 1; i < parts.length - 1; i++) {
    if (parts[i] === '') {
      if (skipIndex !== null) throw new Error(`At most one '::' permitted in '${ipStr}'`);
      skipIndex = i;
    }
  }
  let hi, lo, skipped;
  if (skipIndex !== null) {
    hi = skipIndex; lo = parts.length - skipIndex - 1;
    if (parts[0] === '') { hi -= 1; if (hi) throw new Error(`Leading ':' only permitted as part of '::' in '${ipStr}'`); }
    if (parts[parts.length - 1] === '') { lo -= 1; if (lo) throw new Error(`Trailing ':' only permitted as part of '::' in '${ipStr}'`); }
    skipped = 8 - (hi + lo);
    if (skipped < 1) throw new Error(`Expected at most 7 other parts with '::' in '${ipStr}'`);
  } else {
    if (parts.length !== 8) throw new Error(`Exactly 8 parts expected without '::' in '${ipStr}'`);
    if (parts[0] === '') throw new Error(`Leading ':' only permitted as part of '::' in '${ipStr}'`);
    if (parts[parts.length - 1] === '') throw new Error(`Trailing ':' only permitted as part of '::' in '${ipStr}'`);
    hi = parts.length; lo = 0; skipped = 0;
  }
  let ipInt = 0n;
  for (let i = 0; i < hi; i++) ipInt = (ipInt << 16n) | BigInt(parseHextet(parts[i]));
  ipInt <<= BigInt(16 * skipped);
  for (let i = parts.length - lo; i < parts.length; i++) ipInt = (ipInt << 16n) | BigInt(parseHextet(parts[i]));
  return ipInt;
}

export function parseIPv6(str) {
  let s = str, scopeId = null;
  const pct = s.indexOf('%');
  if (pct !== -1) { scopeId = s.slice(pct + 1); s = s.slice(0, pct); }
  return { val: parseIPv6Str(s), scopeId };
}

function compressHextets(hextets) {
  hextets = hextets.slice();
  let bestStart = -1, bestLen = 0, start = -1, len = 0;
  for (let i = 0; i < hextets.length; i++) {
    if (hextets[i] === '0') {
      len++;
      if (start === -1) start = i;
      if (len > bestLen) { bestLen = len; bestStart = start; }
    } else { len = 0; start = -1; }
  }
  if (bestLen > 1) {
    const end = bestStart + bestLen;
    if (end === hextets.length) hextets.push('');
    hextets.splice(bestStart, end - bestStart, '');
    if (bestStart === 0) hextets.unshift('');
  }
  return hextets;
}

function hextetsOf(val) {
  const hex = val.toString(16).padStart(32, '0');
  const out = [];
  for (let i = 0; i < 32; i += 4) out.push(parseInt(hex.slice(i, i + 4), 16).toString(16));
  return out;
}
function hextetsOfPadded(val) {
  const hex = val.toString(16).padStart(32, '0');
  const out = [];
  for (let i = 0; i < 32; i += 4) out.push(hex.slice(i, i + 4));
  return out;
}

export function ipv4Mapped(val) { return (val >> 32n) === 0xffffn ? (val & 0xffffffffn) : null; }
export function sixtofour(val) { return (val >> 112n) === 0x2002n ? (val >> 80n) & 0xffffffffn : null; }
export function teredo(val) {
  if ((val >> 96n) !== 0x20010000n) return null;
  return [(val >> 64n) & 0xffffffffn, (~val) & 0xffffffffn];
}

export function ipv6Compressed(val) {
  const mapped = ipv4Mapped(val);
  if (mapped !== null) {
    const highHex = compressHextets(hextetsOf(val >> 32n)).join(':');
    return `${highHex}:${ipv4ToStr(mapped)}`;
  }
  return compressHextets(hextetsOf(val)).map(h => h === '' ? '' : h).join(':');
}

export function ipv6Exploded(val) {
  const raw = hextetsOfPadded(val).join(':');
  const mapped = ipv4Mapped(val);
  if (mapped === null) return raw;
  return raw.slice(0, 30) + ipv4ToStr(mapped);
}

const V6 = s => parseIPv6Str(s);
function v6Mask(prefixlen) { return prefixlen === 0 ? 0n : (((1n << BigInt(prefixlen)) - 1n) << BigInt(128 - prefixlen)); }
function inV6Net(val, netStr) {
  const [addr, plStr] = netStr.split('/');
  const pl = parseInt(plStr, 10);
  const mask = v6Mask(pl);
  return (val & mask) === (V6(addr) & mask);
}
const LINKLOCAL = 'fe80::/10', MULTICAST = 'ff00::/8', SITELOCAL = 'fec0::/10';
const PRIVATE = ['::1/128', '::/128', '::ffff:0:0/96', '64:ff9b:1::/48', '100::/64', '2001::/23', '2001:db8::/32', '2002::/16', '3fff::/20', 'fc00::/7', 'fe80::/10'];
const PRIVATE_EXC = ['2001:1::1/128', '2001:1::2/128', '2001:3::/32', '2001:4:112::/48', '2001:20::/28', '2001:30::/28'];
const RESERVED = ['::/8', '100::/8', '200::/7', '400::/6', '800::/5', '1000::/4', '4000::/3', '6000::/3', '8000::/3', 'a000::/3', 'c000::/3', 'e000::/4', 'f000::/5', 'f800::/6', 'fe00::/9'];

function v4InNet(n, netStr) {
  const [addr, plStr] = netStr.split('/');
  const pl = parseInt(plStr, 10);
  const bits = 32;
  const mask = pl === 0 ? 0n : (((1n << BigInt(pl)) - 1n) << BigInt(bits - pl));
  return (BigInt(n) & mask) === (parseIPv4(addr) & mask);
}
const V4_PRIVATE = ['0.0.0.0/8', '10.0.0.0/8', '127.0.0.0/8', '169.254.0.0/16', '172.16.0.0/12', '192.0.0.0/24', '192.0.0.170/31', '192.0.2.0/24', '192.168.0.0/16', '198.18.0.0/15', '198.51.100.0/24', '203.0.113.0/24', '240.0.0.0/4', '255.255.255.255/32'];
const V4_PRIVATE_EXC = ['192.0.0.9/32', '192.0.0.10/32'];

export function ipv4IsPrivate(v4) { return V4_PRIVATE.some(n => v4InNet(v4, n)) && !V4_PRIVATE_EXC.some(n => v4InNet(v4, n)); }
export function ipv4IsLoopback(v4) { return v4InNet(v4, '127.0.0.0/8'); }
export function ipv4IsLinkLocal(v4) { return v4InNet(v4, '169.254.0.0/16'); }
export function ipv4IsMulticast(v4) { return v4InNet(v4, '224.0.0.0/4'); }
export function ipv4IsReserved(v4) { return v4InNet(v4, '240.0.0.0/4'); }
export function ipv4IsUnspecified(v4) { return v4 === 0n; }
export function ipv4IsGlobal(v4) { return !ipv4IsPrivate(v4); }

export function classifyV6(val) {
  const mapped = ipv4Mapped(val);
  const flags = {};
  if (mapped !== null) {
    flags.is_loopback = ipv4IsLoopback(mapped);
    flags.is_link_local = ipv4IsLinkLocal(mapped);
    flags.is_multicast = ipv4IsMulticast(mapped);
    flags.is_private = ipv4IsPrivate(mapped);
    flags.is_global = ipv4IsGlobal(mapped);
    flags.is_unspecified = ipv4IsUnspecified(mapped);
    flags.is_reserved = ipv4IsReserved(mapped);
    flags.is_site_local = false;
  } else {
    flags.is_loopback = val === 1n;
    flags.is_link_local = inV6Net(val, LINKLOCAL);
    flags.is_multicast = inV6Net(val, MULTICAST);
    flags.is_private = PRIVATE.some(n => inV6Net(val, n)) && !PRIVATE_EXC.some(n => inV6Net(val, n));
    flags.is_global = !flags.is_private;
    flags.is_unspecified = val === 0n;
    flags.is_reserved = RESERVED.some(n => inV6Net(val, n));
    flags.is_site_local = inV6Net(val, SITELOCAL);
  }
  return ['is_loopback', 'is_link_local', 'is_multicast', 'is_private', 'is_global', 'is_unspecified', 'is_reserved', 'is_site_local'].filter(k => flags[k]);
}

export function parseAddressAuto(str) {
  if (str.includes(':')) return { version: 6, val: parseIPv6(str).val };
  return { version: 4, val: parseIPv4(str) };
}

export function addrToStr(version, val) { return version === 4 ? ipv4ToStr(val) : ipv6Compressed(val); }

function netmaskBig(prefixlen, bits) { return prefixlen === 0 ? 0n : (((1n << BigInt(prefixlen)) - 1n) << BigInt(bits - prefixlen)); }
export function netmaskOf(net) { return netmaskBig(net.prefixlen, maxBits(net.version)); }
export function hostmaskOf(net) { const bits = maxBits(net.version); return ((1n << BigInt(bits)) - 1n) ^ netmaskOf(net); }
export function broadcastOf(net) { return net.net | hostmaskOf(net); }
export function numAddresses(net) { return 1n << BigInt(maxBits(net.version) - net.prefixlen); }
export function containsAddr(net, val) { return val >= net.net && val <= broadcastOf(net); }

export function parseNetwork(line) {
  let addrPart = line, prefixPart = null;
  const slash = line.indexOf('/');
  if (slash !== -1) { addrPart = line.slice(0, slash); prefixPart = line.slice(slash + 1); }
  const { version, val } = parseAddressAuto(addrPart.trim());
  const bits = maxBits(version);
  let prefixlen = bits;
  if (prefixPart !== null) {
    prefixPart = prefixPart.trim();
    if (/^\d+$/.test(prefixPart)) {
      prefixlen = parseInt(prefixPart, 10);
    } else if (version === 4 && prefixPart.includes('.')) {
      const m = parseIPv4(prefixPart);
      let ones = 0; let seenZero = false;
      for (let i = 31; i >= 0; i--) {
        const bit = (m >> BigInt(i)) & 1n;
        if (bit === 1n) { if (seenZero) throw new Error(`'${prefixPart}' is not a valid netmask`); ones++; }
        else seenZero = true;
      }
      prefixlen = ones;
    } else throw new Error(`'${prefixPart}' is not a valid prefix length`);
    if (prefixlen < 0 || prefixlen > bits) throw new Error(`Invalid prefix length ${prefixlen}`);
  }
  const net = val & netmaskBig(prefixlen, bits);
  return { version, prefixlen, net };
}

export function netToStr(net) { return `${addrToStr(net.version, net.net)}/${net.prefixlen}`; }

export function compareNetworks(a, b) {
  if (a.version !== b.version) return a.version - b.version;
  if (a.net !== b.net) return a.net < b.net ? -1 : 1;
  const ma = netmaskOf(a), mb = netmaskOf(b);
  if (ma !== mb) return ma < mb ? -1 : 1;
  return 0;
}
function netEqual(a, b) { return a.version === b.version && a.prefixlen === b.prefixlen && a.net === b.net; }

export function isSubnetOf(a, b) {
  if (a.version !== b.version) throw new Error(`${netToStr(a)} and ${netToStr(b)} are not of the same version`);
  return b.net <= a.net && broadcastOf(b) >= broadcastOf(a);
}
export function overlaps(a, b) {
  return containsAddr(b, a.net) || containsAddr(b, broadcastOf(a)) || containsAddr(a, b.net) || containsAddr(a, broadcastOf(b));
}

function supernetOnce(net) {
  if (net.prefixlen === 0) return net;
  const prefixlen = net.prefixlen - 1;
  return { version: net.version, prefixlen, net: net.net & netmaskBig(prefixlen, maxBits(net.version)) };
}
function subnetsHalves(net) {
  const bits = maxBits(net.version);
  if (net.prefixlen === bits) return [net];
  const prefixlen = net.prefixlen + 1;
  const step = 1n << BigInt(bits - prefixlen);
  return [{ version: net.version, prefixlen, net: net.net }, { version: net.version, prefixlen, net: net.net + step }];
}

export function addressExclude(network, other) {
  if (network.version !== other.version) throw new Error(`${netToStr(network)} and ${netToStr(other)} are not of the same version`);
  if (!isSubnetOf(other, network)) throw new Error(`${netToStr(other)} not contained in ${netToStr(network)}`);
  if (netEqual(other, network)) return [];
  let [s1, s2] = subnetsHalves(network);
  const out = [];
  while (!netEqual(s1, other) && !netEqual(s2, other)) {
    if (isSubnetOf(other, s1)) { out.push(s2); [s1, s2] = subnetsHalves(s1); }
    else if (isSubnetOf(other, s2)) { out.push(s1); [s1, s2] = subnetsHalves(s2); }
    else throw new Error('Error performing exclusion');
  }
  out.push(netEqual(s1, other) ? s2 : s1);
  return out;
}

function trailingZeroBits(n, bits) {
  if (n === 0n) return bits;
  let c = 0;
  while ((n & 1n) === 0n) { n >>= 1n; c++; }
  return Math.min(bits, c);
}
function bitLength(n) { return n === 0n ? 0 : n.toString(2).length; }

export function summarizeAddressRange(version, firstVal, lastVal) {
  const bits = maxBits(version);
  const allOnes = (1n << BigInt(bits)) - 1n;
  const out = [];
  let first = firstVal;
  while (first <= lastVal) {
    const nbits = Math.min(trailingZeroBits(first, bits), bitLength(lastVal - first + 1n) - 1);
    out.push({ version, prefixlen: bits - nbits, net: first });
    first += 1n << BigInt(nbits);
    if (first - 1n === allOnes) break;
  }
  return out;
}

export function collapseAddressesInternal(nets) {
  let toMerge = nets.slice();
  const subnets = new Map();
  const keyOf = n => `${n.version}:${n.prefixlen}:${n.net}`;
  while (toMerge.length) {
    const net = toMerge.pop();
    const sup = supernetOnce(net);
    const key = keyOf(sup);
    if (!subnets.has(key)) subnets.set(key, net);
    else if (!netEqual(subnets.get(key), net)) { subnets.delete(key); toMerge.push(sup); }
  }
  const sorted = [...subnets.values()].sort(compareNetworks);
  const out = [];
  let last = null;
  for (const net of sorted) {
    if (last !== null && broadcastOf(last) >= broadcastOf(net)) continue;
    out.push(net);
    last = net;
  }
  return out;
}

export function bigComma(n) {
  const s = n.toString();
  return s.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}
