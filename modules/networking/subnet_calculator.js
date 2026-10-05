import { module } from './_cat.js';

function ipToInt(ip) {
  const parts = ip.split('.').map(Number);
  if (parts.length !== 4 || parts.some(p => Number.isNaN(p) || p < 0 || p > 255)) throw new Error(`Not a valid IPv4 address: ${ip}`);
  return ((parts[0] << 24) | (parts[1] << 16) | (parts[2] << 8) | parts[3]) >>> 0;
}
function intToIp(n) { return [(n >>> 24) & 255, (n >>> 16) & 255, (n >>> 8) & 255, n & 255].join('.'); }

module('Subnet Calculator', 'Shows network, broadcast, usable range, mask and host count for an IPv4 CIDR.', [],
  (t) => t.split('\n').map(l => l.trim()).filter(Boolean).map(line => {
    const [ip, prefixStr] = line.split('/');
    const prefix = prefixStr !== undefined ? parseInt(prefixStr, 10) : 32;
    if (prefix < 0 || prefix > 32) throw new Error(`Invalid prefix length: /${prefix}`);
    const ipInt = ipToInt(ip);
    const mask = prefix === 0 ? 0 : (0xffffffff << (32 - prefix)) >>> 0;
    const network = ipInt & mask;
    const broadcast = network | (~mask >>> 0);
    const total = 2 ** (32 - prefix);
    const usable = prefix < 31 ? Math.max(total - 2, 0) : total;
    const rows = [
      `Input: ${line}`, `Network: ${intToIp(network)}/${prefix}`, `Netmask: ${intToIp(mask)}`, `Wildcard/Hostmask: ${intToIp(~mask >>> 0)}`,
      `Broadcast: ${intToIp(broadcast)}`, `Total addresses: ${total}`, `Usable hosts: ${usable}`,
      `Binary: ${intToIp(network).split('.').map(b => (+b).toString(2).padStart(8, '0')).join('.')}`,
    ];
    if (total > 2) rows.push(`Usable range: ${intToIp(network + 1)} - ${intToIp(broadcast - 1)}`);
    return rows.join('\n');
  }).join('\n\n'), { text: true });
