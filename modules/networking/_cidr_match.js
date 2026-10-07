import { expandIpv6 } from './_dns_enrichment.js';

function ipv4BigInt(ip) {
  const parts = String(ip).split('.').map(Number);
  if (parts.length !== 4 || parts.some(n => !Number.isInteger(n) || n < 0 || n > 255)) throw new Error('Invalid IPv4 address');
  return parts.reduce((acc, n) => (acc << 8n) | BigInt(n), 0n);
}

function ipv6BigInt(ip) {
  return BigInt('0x' + expandIpv6(ip).replace(/:/g, ''));
}

export function ipBits(ip) {
  return String(ip).includes(':') ? 128 : 32;
}

export function ipBigInt(ip) {
  return String(ip).includes(':') ? ipv6BigInt(ip) : ipv4BigInt(ip);
}

export function cidrContains(cidr, ip) {
  const [networkText, prefixText] = String(cidr || '').trim().split('/');
  if (!networkText || prefixText == null) return false;
  const bits = ipBits(networkText);
  if (bits !== ipBits(ip)) return false;
  const prefix = Number(prefixText);
  if (!Number.isInteger(prefix) || prefix < 0 || prefix > bits) return false;
  const shift = BigInt(bits - prefix);
  return (ipBigInt(networkText) >> shift) === (ipBigInt(ip) >> shift);
}

export function compileCidrs(records) {
  return (Array.isArray(records) ? records : []).map(record => {
    const cidr = record?.cidr || record?.network;
    if (!cidr || !String(cidr).includes('/')) return null;
    try {
      const [networkText, prefixText] = String(cidr).split('/');
      const bits = ipBits(networkText);
      const prefix = Number(prefixText);
      if (!Number.isInteger(prefix) || prefix < 0 || prefix > bits) return null;
      const shift = BigInt(bits - prefix);
      return { record, bits, shift, network: ipBigInt(networkText) >> shift };
    } catch { return null; }
  }).filter(Boolean);
}

export function findCidrMatches(compiled, ip) {
  let value, bits;
  try { value = ipBigInt(ip); bits = ipBits(ip); } catch { return []; }
  return compiled.filter(item => item.bits === bits && (value >> item.shift) === item.network).map(item => item.record);
}
