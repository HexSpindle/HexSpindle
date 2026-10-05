import { module } from './_cat.js';

export function tcpIpChecksum(u8) {
  const padded = u8.length % 2 ? Uint8Array.of(...u8, 0) : u8;
  let s = 0;
  for (let i = 0; i < padded.length; i += 2) s += (padded[i] << 8) | padded[i + 1];
  while (s >>> 16) s = (s & 0xffff) + (s >>> 16);
  return ~s & 0xffff;
}

module('TCP/IP Checksum', '16-bit ones-complement Internet checksum (RFC 1071).', [],
  (data) => tcpIpChecksum(data).toString(16).padStart(4, '0'));
