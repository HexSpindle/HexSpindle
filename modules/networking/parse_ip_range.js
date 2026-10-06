import { module } from './_cat.js';
import { A } from '../../core/registry.js';

// Accepted input shapes: a single CIDR block, a hyphenated range, or a newline-separated
// list of either (the list is reduced to the range between its lowest and highest address).
const IPV4_CIDR = /^\s*((?:\d{1,3}\.){3}\d{1,3})\/(\d\d?)\s*$/;
const IPV4_RANGE = /^\s*((?:\d{1,3}\.){3}\d{1,3})\s*-\s*((?:\d{1,3}\.){3}\d{1,3})\s*$/;
const IPV4_LIST = /^\s*(((?:\d{1,3}\.){3}\d{1,3})(\/(\d\d?))?(\n|$)(\n*))+\s*$/;
const IPV6_CIDR = /^\s*(((?=.*::)(?!.*::.+::)(::)?([\dA-F]{1,4}:(:|\b)|){5}|([\dA-F]{1,4}:){6})((([\dA-F]{1,4}((?!\4)::|:\b|(?![\dA-F])))|(?!\3\4)){2}|(((2[0-4]|1\d|[1-9])?\d|25[0-5])\.?\b){4}))\/(\d\d?\d?)\s*$/i;
const IPV6_RANGE = /^\s*(((?=.*::)(?!.*::[^-]+::)(::)?([\dA-F]{1,4}:(:|\b)|){5}|([\dA-F]{1,4}:){6})((([\dA-F]{1,4}((?!\4)::|:\b|(?![\dA-F])))|(?!\3\4)){2}|(((2[0-4]|1\d|[1-9])?\d|25[0-5])\.?\b){4}))\s*-\s*(((?=.*::)(?!.*::.+::)(::)?([\dA-F]{1,4}:(:|\b)|){5}|([\dA-F]{1,4}:){6})((([\dA-F]{1,4}((?!\17)::|:\b|(?![\dA-F])))|(?!\16\17)){2}|(((2[0-4]|1\d|[1-9])?\d|25[0-5])\.?\b){4}))\s*$/i;
const IPV6_LIST = /^\s*((((?=.*::)(?!.*::.+::)(::)?([\dA-F]{1,4}:(:|\b)|){5}|([\dA-F]{1,4}:){6})((([\dA-F]{1,4}((?!\4)::|:\b|(?![\dA-F])))|(?!\3\4)){2}|(((2[0-4]|1\d|[1-9])?\d|25[0-5])\.?\b){4}))(\/(\d\d?\d?))?(\n|$)(\n*))+\s*$/i;

const LARGE_RANGE_ERROR = 'The specified range contains more than 65,536 addresses. Running this query could crash your browser. If you want to run it, select the "Allow large queries" option. You are advised to turn off "Auto Bake" whilst editing large ranges.';

function strToIpv4(s) {
  const blocks = s.split('.');
  if (blocks.length !== 4) throw new Error('More than 4 blocks.');
  const n = [];
  for (let i = 0; i < 4; i++) {
    n[i] = parseInt(blocks[i], 10);
    if (n[i] < 0 || n[i] > 255) throw new Error('Block out of range.');
  }
  return ((n[0] << 24) + (n[1] << 16) + (n[2] << 8) + n[3]) | 0;
}

function ipv4ToStr(v) {
  return `${(v >> 24) & 255}.${(v >> 16) & 255}.${(v >> 8) & 255}.${v & 255}`;
}

function strToIpv6(s) {
  const blocks = s.split(':');
  if (blocks.length < 3 || blocks.length > 8) throw new Error('Badly formatted IPv6 address.');
  const nums = [];
  for (let i = 0; i < blocks.length; i++) {
    nums[i] = parseInt(blocks[i], 16);
    if (nums[i] < 0 || nums[i] > 65535) throw new Error('Block out of range.');
  }
  const out = new Array(8);
  let j = 0;
  for (let i = 0; i < 8; i++) {
    if (Number.isNaN(nums[j])) {
      out[i] = 0;
      if (i === 8 - nums.slice(j).length) j++;
    } else {
      out[i] = nums[j];
      j++;
    }
  }
  return out;
}

function hexPad(v, width) { return v.toString(16).padStart(width, '0'); }

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
      if (i !== start) out += hexPad(v[i], 1) + ':';
      else { out += ':'; i = end; if (end === 7) out += ':'; }
    }
    if (out[0] === ':') out = ':' + out;
  } else {
    for (let i = 0; i < 8; i++) out += hexPad(v[i], 4) + ':';
  }
  return out.slice(0, out.length - 1);
}

function genIpv6Mask(cidr) {
  const mask = new Array(8);
  for (let i = 0; i < 8; i++) {
    if (cidr > (i + 1) * 16) mask[i] = 0x0000ffff;
    else {
      let shift = cidr - i * 16;
      if (shift < 0) shift = 0;
      mask[i] = ~((0x0000ffff >>> shift) | 0xffff0000);
    }
  }
  return mask;
}

function generateIpv4Range(ip, endIp) {
  const range = [];
  if (endIp >= ip) for (; ip <= endIp; ip++) range.push(ipv4ToStr(ip));
  else range[0] = 'Second IP address smaller than first.';
  return range;
}

function ipv4CidrRange(m, info, enumerate, large) {
  const network = strToIpv4(m[1]), cidr = parseInt(m[2], 10);
  if (cidr < 0 || cidr > 31) throw new Error('IPv4 CIDR must be less than 32');
  const mask = ~(0xffffffff >>> cidr), ip1 = network & mask, ip2 = ip1 | ~mask;
  let out = '';
  if (info) {
    out += 'Network: ' + ipv4ToStr(ip1) + '\n';
    out += 'CIDR: ' + cidr + '\n';
    out += 'Mask: ' + ipv4ToStr(mask) + '\n';
    out += 'Range: ' + ipv4ToStr(ip1) + ' - ' + ipv4ToStr(ip2) + '\n';
    out += 'Total addresses in range: ' + (((ip2 - ip1) >>> 0) + 1) + '\n\n';
  }
  if (enumerate) out += (cidr >= 16 || large) ? generateIpv4Range(ip1, ip2).join('\n') : LARGE_RANGE_ERROR;
  return out;
}

function ipv4HyphenatedRange(range, info, enumerate, large) {
  const ip1 = strToIpv4(range[0].split('-')[0].trim()), ip2 = strToIpv4(range[0].split('-')[1].trim());
  let out = '', diff = ip1 ^ ip2, cidr = 32, mask = 0;
  while (diff !== 0) { diff >>= 1; cidr--; mask = (mask << 1) | 1; }
  mask = ~mask >>> 0;
  const network = ip1 & mask, subIp1 = network & mask, subIp2 = subIp1 | ~mask;
  if (info) {
    out += `Minimum subnet required to hold this range:
\tNetwork: ${ipv4ToStr(network)}
\tCIDR: ${cidr}
\tMask: ${ipv4ToStr(mask)}
\tSubnet range: ${ipv4ToStr(subIp1)} - ${ipv4ToStr(subIp2)}
\tTotal addresses in subnet: ${((subIp2 - subIp1) >>> 0) + 1}

Range: ${ipv4ToStr(ip1)} - ${ipv4ToStr(ip2)}
Total addresses in range: ${((ip2 - ip1) >>> 0) + 1}

`;
  }
  if (enumerate) out += (((ip2 - ip1) >>> 0) <= 65536 || large) ? generateIpv4Range(ip1, ip2).join('\n') : LARGE_RANGE_ERROR;
  return out;
}

function ipv4ListedRange(m, info, enumerate, large) {
  let list = m[0].split('\n').filter(Boolean);
  const cidrs = list.filter(a => a.includes('/'));
  for (const entry of cidrs) {
    const network = strToIpv4(entry.split('/')[0]);
    const cidr = parseInt(entry.split('/')[1], 10);
    if (cidr < 0 || cidr > 31) throw new Error('IPv4 CIDR must be less than 32');
    const mask = ~(0xffffffff >>> cidr), ip1 = network & mask, ip2 = ip1 | ~mask;
    list.splice(list.indexOf(entry), 1);
    list.push(ipv4ToStr(ip1), ipv4ToStr(ip2));
  }
  list = list.sort((a, b) => strToIpv4(a) - strToIpv4(b));
  return ipv4HyphenatedRange([`${list[0]} - ${list[list.length - 1]}`], info, enumerate, large);
}

function ipv6Total(ip1, ip2) {
  const total = new Array(128);
  for (let i = 0; i < 8; i++) {
    const t = (ip2[i] - ip1[i]).toString(2);
    if (t !== '0') for (let n = 0; n < t.length; n++) total[i * 16 + 16 - (t.length - n)] = t[n];
  }
  return parseInt(total.join(''), 2) + 1;
}

function ipv6CidrRange(m, info) {
  const network = strToIpv6(m[1]), cidr = parseInt(m[m.length - 1], 10);
  if (cidr < 0 || cidr > 127) throw new Error('IPv6 CIDR must be less than 128');
  const mask = genIpv6Mask(cidr), ip1 = new Array(8), ip2 = new Array(8);
  for (let i = 0; i < 8; i++) { ip1[i] = network[i] & mask[i]; ip2[i] = ip1[i] | (~mask[i] & 0x0000ffff); }
  if (!info) return '';
  return 'Network: ' + ipv6ToStr(ip1) + '\n' + 'Shorthand: ' + ipv6ToStr(ip1, true) + '\n' +
    'CIDR: ' + cidr + '\n' + 'Mask: ' + ipv6ToStr(mask) + '\n' +
    'Range: ' + ipv6ToStr(ip1) + ' - ' + ipv6ToStr(ip2) + '\n' +
    'Total addresses in range: ' + ipv6Total(ip1, ip2) + '\n\n';
}

function ipv6HyphenatedRange(range, info) {
  const ip1 = strToIpv6(range[0].split('-')[0].trim()), ip2 = strToIpv6(range[0].split('-')[1].trim());
  if (!info) return '';
  return 'Range: ' + ipv6ToStr(ip1) + ' - ' + ipv6ToStr(ip2) + '\n' +
    'Shorthand range: ' + ipv6ToStr(ip1, true) + ' - ' + ipv6ToStr(ip2, true) + '\n' +
    'Total addresses in range: ' + ipv6Total(ip1, ip2) + '\n\n';
}

function ipv6ListedRange(m, info) {
  let list = m[0].split('\n').filter(s => s.trim()).map(s => s.trim());
  const cidrs = list.filter(a => a.includes('/'));
  for (const entry of cidrs) {
    const network = strToIpv6(entry.split('/')[0]);
    const cidr = parseInt(entry.split('/')[1], 10);
    if (cidr < 0 || cidr > 127) throw new Error('IPv6 CIDR must be less than 128');
    const mask = genIpv6Mask(cidr), ip1 = new Array(8), ip2 = new Array(8);
    for (let j = 0; j < 8; j++) { ip1[j] = network[j] & mask[j]; ip2[j] = ip1[j] | (~mask[j] & 0x0000ffff); }
    list.splice(list.indexOf(entry), 1);
    list.push(ipv6ToStr(ip1), ipv6ToStr(ip2));
  }
  list = list.sort((a, b) => {
    const x = strToIpv6(a), y = strToIpv6(b);
    for (let i = 0; i < x.length; i++) if (x[i] !== y[i]) return x[i] - y[i];
    return 0;
  });
  return ipv6HyphenatedRange([`${list[0]} - ${list[list.length - 1]}`], info);
}

module('Parse IP range', 'Given a CIDR range, a hyphenated range or a newline-separated list of either, describes the network and optionally enumerates every address. IPv6 is supported but is not enumerated.',
  [A.boolean('Include network info', true), A.boolean('Enumerate IP addresses', true), A.boolean('Allow large queries', false)],
  (t, info, enumerate, large) => {
    let m;
    if ((m = IPV4_CIDR.exec(t))) return ipv4CidrRange(m, info, enumerate, large);
    if ((m = IPV4_RANGE.exec(t))) return ipv4HyphenatedRange(m, info, enumerate, large);
    if ((m = IPV4_LIST.exec(t))) return ipv4ListedRange(m, info, enumerate, large);
    if ((m = IPV6_CIDR.exec(t))) return ipv6CidrRange(m, info);
    if ((m = IPV6_RANGE.exec(t))) return ipv6HyphenatedRange(m, info);
    if ((m = IPV6_LIST.exec(t))) return ipv6ListedRange(m, info);
    throw new Error('Invalid input.\n\nEnter either a CIDR range (e.g. 10.0.0.0/24) or a hyphenated range (e.g. 10.0.0.0 - 10.0.1.0). IPv6 also supported.');
  }, { text: true });
