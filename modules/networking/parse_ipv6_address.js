import { module } from './_cat.js';
import { parseIPv6 } from './_ipaddr.js';

const IPV6_REGEX = /^\s*(((?=.*::)(?!.*::.+::)(::)?([\dA-F]{1,4}:(:|\b)|){5}|([\dA-F]{1,4}:){6})((([\dA-F]{1,4}((?!\4)::|:\b|(?![\dA-F])))|(?!\3\4)){2}|(((2[0-4]|1\d|[1-9])?\d|25[0-5])\.?\b){4}))\s*$/i;

const hex = (v, n = 2) => v.toString(16).padStart(n, '0');
const bin = (v, n = 8) => v.toString(2).padStart(n, '0');
const ipv4ToStr = v => `${(v >> 24) & 255}.${(v >> 16) & 255}.${(v >> 8) & 255}.${v & 255}`;

/** The eight 16-bit groups of the address. HexSpindle's own parser is used here, so an
 * IPv4-embedded form such as ::ffff:192.168.1.1 is read correctly. */
function toGroups(str) {
  const { val } = parseIPv6(str.trim());
  const out = new Array(8);
  for (let i = 0; i < 8; i++) out[7 - i] = Number((val >> BigInt(16 * i)) & 0xffffn);
  return out;
}

function ipv6ToStr(v, compact) {
  let out = '';
  if (compact) {
    let start = -1, end = -1, s = 0, e = -1;
    for (let i = 0; i < 8; i++) {
      if (v[i] === 0 && e === i - 1) e = i;
      else if (v[i] === 0) { s = i; e = i; }
      if (e >= 0 && (e - s) > (end - start)) { start = s; end = e; }
    }
    for (let i = 0; i < 8; i++) {
      if (i !== start) out += hex(v[i], 1) + ':';
      else { out += ':'; i = end; if (end === 7) out += ':'; }
    }
    if (out[0] === ':') out = ':' + out;
  } else {
    for (let i = 0; i < 8; i++) out += hex(v[i], 4) + ':';
  }
  return out.slice(0, out.length - 1);
}

const MULTICAST_SCOPES = {
  0xff01: 'Interface Local Scope', 0xff02: 'Link Local Scope', 0xff03: 'Realm Local Scope',
  0xff04: 'Admin Local Scope', 0xff05: 'Site Local Scope', 0xff08: 'Organisation Local Scope',
  0xff0e: 'Global Scope',
};

const MULTICAST_ADDRESSES = {
  1: 'All nodes', 2: 'All routers', 5: 'OSPFv3 - All OSPF routers', 6: 'OSPFv3 - All Designated Routers',
  8: 'IS-IS for IPv6 Routers', 9: 'RIP Routers', 0xa: 'EIGRP Routers',
  0xc: 'Simple Service Discovery Protocol', 0xd: 'PIM Routers', 0x16: 'MLDv2 Reports (defined in RFC3810)',
  0x6b: 'Precision Time Protocol v2 Peer Delay Measurement Messages', 0xfb: 'Multicast DNS',
  0x101: 'Network Time Protocol', 0x108: 'Network Information Service', 0x114: 'Experiments',
  0x181: 'Precision Time Protocol v2 Messages (exc. Peer Delay)',
};

function teredo(v) {
  let out = '\nTeredo tunneling IPv6 address detected\n';
  const serverIpv4 = (v[2] << 16) + v[3];
  const udpPort = (~v[5]) & 0xffff;
  const clientIpv4 = ~((v[6] << 16) + v[7]);
  const flagCone = (v[4] >>> 15) & 1, flagR = (v[4] >>> 14) & 1;
  const flagRandom1 = (v[4] >>> 10) & 15, flagUg = (v[4] >>> 8) & 3, flagRandom2 = v[4] & 255;
  out += '\nServer IPv4 address: ' + ipv4ToStr(serverIpv4) +
    '\nClient IPv4 address: ' + ipv4ToStr(clientIpv4) +
    '\nClient UDP port:     ' + udpPort + '\nFlags:' + '\n\tCone:    ' + flagCone;
  out += flagCone ? ' (Client is behind a cone NAT)' : ' (Client is not behind a cone NAT)';
  out += '\n\tR:       ' + flagR;
  if (flagR) out += ' Error: This flag should be set to 0. See RFC 5991 and RFC 4380.';
  out += '\n\tRandom1: ' + bin(flagRandom1, 4) + '\n\tUG:      ' + bin(flagUg, 2);
  if (flagUg) out += ' Error: This flag should be set to 00. See RFC 4380.';
  out += '\n\tRandom2: ' + bin(flagRandom2, 8);
  if (!flagR && !flagUg && flagRandom1 && flagRandom2) out += '\n\nThis is a valid Teredo address which complies with RFC 4380 and RFC 5991.';
  else if (!flagR && !flagUg) out += '\n\nThis is a valid Teredo address which complies with RFC 4380, however it does not comply with RFC 5991 (Teredo Security Updates) as there are no randomised bits in the flag field.';
  else out += '\n\nThis is an invalid Teredo address.';
  return out + '\n\nTeredo prefix range: 2001::/32';
}

function multicast(v) {
  let out = '\nThis is a reserved multicast address.\nMulticast addresses range: ff00::/8';
  if (MULTICAST_SCOPES[v[0]]) out += `\n\nReserved Multicast Block for ${MULTICAST_SCOPES[v[0]]}`;
  if (v[6] === 1) {
    if (v[7] === 2) out += "\nReserved Multicast Address for 'All DHCP Servers and Relay Agents (defined in RFC3315)'";
    else if (v[7] === 3) out += "\nReserved Multicast Address for 'All LLMNR Hosts (defined in RFC4795)'";
  } else if (MULTICAST_ADDRESSES[v[7]]) {
    out += `\nReserved Multicast Address for '${MULTICAST_ADDRESSES[v[7]]}'`;
  }
  return out;
}

function classify(v, shorthand) {
  if (shorthand === '::') return '\nUnspecified address corresponding to 0.0.0.0/32 in IPv4.\nUnspecified address range: ::/128';
  if (shorthand === '::1') return '\nLoopback address to the local host corresponding to 127.0.0.1/8 in IPv4.\nLoopback addresses range: ::1/128';
  const zeros = v[0] === 0 && v[1] === 0 && v[2] === 0 && v[3] === 0;
  if (zeros && v[4] === 0 && v[5] === 0xffff) {
    return '\nIPv4-mapped IPv6 address detected. IPv6 clients will be handled natively by default, and IPv4 clients appear as IPv6 clients at their IPv4-mapped IPv6 address.' +
      '\nMapped IPv4 address: ' + ipv4ToStr((v[6] << 16) + v[7]) + '\nIPv4-mapped IPv6 addresses range: ::ffff:0:0/96';
  }
  if (zeros && v[4] === 0xffff && v[5] === 0) {
    return '\nIPv4-translated address detected. Used by Stateless IP/ICMP Translation (SIIT). See RFCs 6145 and 6052 for more details.' +
      '\nTranslated IPv4 address: ' + ipv4ToStr((v[6] << 16) + v[7]) + '\nIPv4-translated addresses range: ::ffff:0:0:0/96';
  }
  if (v[0] === 0x100) return '\nDiscard prefix detected. This is used when forwarding traffic to a sinkhole router to mitigate the effects of a denial-of-service attack. See RFC 6666 for more details.\nDiscard range: 100::/64';
  if (v[0] === 0x64 && v[1] === 0xff9b && v[2] === 0 && v[3] === 0 && v[4] === 0 && v[5] === 0) {
    return "\n'Well-Known' prefix for IPv4/IPv6 translation detected. See RFC 6052 for more details." +
      '\nTranslated IPv4 address: ' + ipv4ToStr((v[6] << 16) + v[7]) + "\n'Well-Known' prefix range: 64:ff9b::/96";
  }
  if (v[0] === 0x2001 && v[1] === 0) return teredo(v);
  if (v[0] === 0x2001 && v[1] === 0x2 && v[2] === 0) return '\nAssigned to the Benchmarking Methodology Working Group (BMWG) for benchmarking IPv6. Corresponds to 198.18.0.0/15 for benchmarking IPv4. See RFC 5180 for more details.\nBMWG range: 2001:2::/48';
  if (v[0] === 0x2001 && v[1] >= 0x10 && v[1] <= 0x1f) return '\nDeprecated, previously ORCHIDv1 (Overlay Routable Cryptographic Hash Identifiers).\nORCHIDv1 range: 2001:10::/28\nORCHIDv2 now uses 2001:20::/28.';
  if (v[0] === 0x2001 && v[1] >= 0x20 && v[1] <= 0x2f) return '\nORCHIDv2 (Overlay Routable Cryptographic Hash Identifiers).\nThese are non-routed IPv6 addresses used for Cryptographic Hash Identifiers.\nORCHIDv2 range: 2001:20::/28';
  if (v[0] === 0x2001 && v[1] === 0xdb8) return '\nThis is a documentation IPv6 address. This range should be used whenever an example IPv6 address is given or to model networking scenarios. Corresponds to 192.0.2.0/24, 198.51.100.0/24, and 203.0.113.0/24 in IPv4.\nDocumentation range: 2001:db8::/32';
  if (v[0] === 0x2002) {
    const interfaceIdStr = v[4].toString(16) + v[5].toString(16) + v[6].toString(16) + v[7].toString(16);
    return '\n6to4 transition IPv6 address detected. See RFC 3056 for more details.\n6to4 prefix range: 2002::/16' +
      '\n\nEncapsulated IPv4 address: ' + ipv4ToStr((v[1] << 16) + v[2]) +
      '\nSLA ID: ' + v[3] +
      '\nInterface ID (base 16): ' + interfaceIdStr +
      '\nInterface ID (base 10): ' + BigInt('0x' + interfaceIdStr).toString();
  }
  if (v[0] >= 0xfc00 && v[0] <= 0xfdff) return '\nThis is a unique local address comparable to the IPv4 private addresses 10.0.0.0/8, 172.16.0.0/12 and 192.168.0.0/16. See RFC 4193 for more details.\nUnique local addresses range: fc00::/7';
  if (v[0] >= 0xfe80 && v[0] <= 0xfebf) return '\nThis is a link-local address comparable to the auto-configuration addresses 169.254.0.0/16 in IPv4.\nLink-local addresses range: fe80::/10';
  if (v[0] >= 0xff00) return multicast(v);
  return '';
}

module('Parse IPv6 address', 'Shows the longhand and shorthand forms of an IPv6 address plus what the address range it falls in is reserved for (Teredo, 6to4, multicast, documentation, ...).', [],
  (t) => {
    const match = IPV6_REGEX.exec(t);
    if (!match) throw new Error('Invalid IPv6 address');
    const v = toGroups(match[1]);
    let out = 'Longhand:  ' + ipv6ToStr(v) + '\nShorthand: ' + ipv6ToStr(v, true) + '\n';
    out += classify(v, ipv6ToStr(v, true));
    // A modified EUI-64 interface identifier is marked by ff:fe in the 12th and 13th octets.
    if ((v[5] & 0xff) === 0xff && v[6] >>> 8 === 0xfe) {
      out += '\n\nThis IPv6 address contains a modified EUI-64 address, identified by the presence of FF:FE in the 12th and 13th octets.';
      const intIdent = [hex(v[4] >>> 8), hex(v[4] & 0xff), hex(v[5] >>> 8), hex(v[5] & 0xff),
        hex(v[6] >>> 8), hex(v[6] & 0xff), hex(v[7] >>> 8), hex(v[7] & 0xff)].join(':');
      const mac = [hex((v[4] >>> 8) ^ 2), hex(v[4] & 0xff), hex(v[5] >>> 8), hex(v[6] & 0xff),
        hex(v[7] >>> 8), hex(v[7] & 0xff)].join(':');
      out += '\nInterface identifier: ' + intIdent + '\nMAC address:          ' + mac;
    }
    return out;
  }, { text: true });
