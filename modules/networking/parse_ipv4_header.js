import { module } from './_cat.js';
import { A, Html } from '../../core/registry.js';
import { rawOrHex, hexSep, ipv4Str } from './_packet.js';
import { protocolLookup } from './_ip_protocols.js';

const PROTOS = { 1: 'ICMP', 2: 'IGMP', 6: 'TCP', 17: 'UDP', 41: 'IPv6', 47: 'GRE', 50: 'ESP', 51: 'AH', 89: 'OSPF' };

const hex = (v, n = 2) => v.toString(16).padStart(n, '0');

/** RFC 791 header checksum: the one's-complement sum over the WHOLE header (options
 * included) with the checksum field taken as zero. */
function headerChecksum(b, ihlBytes) {
  let s = 0;
  for (let i = 0; i < ihlBytes; i += 2) {
    if (i === 10) continue;
    s += ((b[i] || 0) << 8) | (b[i + 1] || 0);
  }
  while (s >> 16) s = (s & 0xffff) + (s >> 16);
  return 0xffff - s;
}

function textReport(b) {
  if (b.length < 20) throw new Error('IPv4 header needs at least 20 bytes');
  const dv = new DataView(b.buffer, b.byteOffset, b.byteLength);
  const ihl = (b[0] & 15) * 4;
  const flags = b[6] >> 5;
  const chk = dv.getUint16(10);
  let s = 0;
  for (let i = 0; i < ihl - 1; i += 2) s += dv.getUint16(i);
  while (s >> 16) s = (s & 0xffff) + (s >> 16);
  return [
    `Version: ${b[0] >> 4}`, `Header length (IHL): ${ihl} bytes`, `DSCP: ${b[1] >> 2}  ECN: ${b[1] & 3}`,
    `Total length: ${dv.getUint16(2)}`, `Identification: 0x${dv.getUint16(4).toString(16).padStart(4, '0')}`,
    `Flags: ${flags.toString(2).padStart(3, '0')} (DF=${(flags >> 1) & 1}, MF=${flags & 1})`,
    `Fragment offset: ${(dv.getUint16(6) & 0x1fff) * 8}`, `TTL: ${b[8]}`, `Protocol: ${b[9]} (${PROTOS[b[9]] || 'unknown'})`,
    `Header checksum: 0x${chk.toString(16).padStart(4, '0')} (${s === 0xffff ? 'valid' : 'INVALID'})`,
    `Source IP: ${ipv4Str(b, 12)}`, `Destination IP: ${ipv4Str(b, 16)}`,
    `Options: ${hexSep(b.subarray(20, ihl)) || 'none'}`,
  ].join('\n');
}

function table(input) {
  let ihl = input[0] & 0x0f;
  const dscp = (input[1] >>> 2) & 0x3f, ecn = input[1] & 0x03,
    length = input[2] << 8 | input[3],
    identification = input[4] << 8 | input[5],
    flags = (input[6] >>> 5) & 0x07,
    fragOffset = (input[6] & 0x1f) << 8 | input[7],
    ttl = input[8], protocol = input[9],
    checksum = input[10] << 8 | input[11],
    srcIP = `${input[12]}.${input[13]}.${input[14]}.${input[15]}`,
    dstIP = `${input[16]}.${input[17]}.${input[18]}.${input[19]}`;
  let version = (input[0] >>> 4) & 0x0f, options = [];
  const headerBytes = ihl * 4;
  if (version !== 4) version = version + ' (Error: for IPv4 headers, this should always be set to 4)';
  if (ihl < 5) ihl = ihl + ' (Error: this should always be at least 5)';
  else if (ihl > 5) options = input.slice(20, ihl * 4);
  const protocolInfo = protocolLookup[protocol] || { keyword: '', protocol: '' };
  const correct = hex(headerChecksum(input, Math.max(20, headerBytes))), given = hex(checksum);
  const checksumResult = correct === given ? `${given} (correct)` : `${given} (incorrect, should be ${correct})`;
  const data = input.slice(ihl * 4);
  let out = `<table class='table table-hover table-sm table-bordered table-nonfluid'><tr><th>Field</th><th>Value</th></tr>
<tr><td>Version</td><td>${version}</td></tr>
<tr><td>Internet Header Length (IHL)</td><td>${ihl} (${ihl * 4} bytes)</td></tr>
<tr><td>Differentiated Services Code Point (DSCP)</td><td>${dscp}</td></tr>
<tr><td>Explicit Congestion Notification (ECN)</td><td>${ecn}</td></tr>
<tr><td>Total length</td><td>${length} bytes
  IP header: ${ihl * 4} bytes
  Data: ${length - ihl * 4} bytes</td></tr>
<tr><td>Identification</td><td>0x${hex(identification)} (${identification})</td></tr>
<tr><td>Flags</td><td>0x${hex(flags, 2)}
  Reserved bit:${flags >> 2} (must be 0)
  Don't fragment:${flags >> 1 & 1}
  More fragments:${flags & 1}</td></tr>
<tr><td>Fragment offset</td><td>${fragOffset}</td></tr>
<tr><td>Time-To-Live</td><td>${ttl}</td></tr>
<tr><td>Protocol</td><td>${protocol}, ${protocolInfo.protocol} (${protocolInfo.keyword})</td></tr>
<tr><td>Header checksum</td><td>${checksumResult}</td></tr>
<tr><td>Source IP address</td><td>${srcIP}</td></tr>
<tr><td>Destination IP address</td><td>${dstIP}</td></tr>
<tr><td>Data (hex)</td><td>${hexSep(data, ' ')}</td></tr>`;
  if (ihl > 5) out += `<tr><td>Options</td><td>${hexSep(options, ' ')}</td></tr>`;
  return out + '</table>';
}

module('Parse IPv4 header', 'Decodes the fields of an IPv4 header. "Table" shows them as a table; "Data" returns the payload after the header; "Text report" is a plain-text summary.',
  [A.select('Input format', ['Hex', 'Raw']), A.select('Output format', ['Table', 'Data (hex)', 'Data (raw)', 'Text report'])],
  (data, fmt, outFmt = 'Table') => {
    const b = rawOrHex(data, fmt);
    if (outFmt === 'Text report') return textReport(b);
    const ihl = b[0] & 0x0f;
    const payload = b.slice(ihl * 4);
    if (outFmt === 'Data (hex)') return hexSep(payload, ' ');
    if (outFmt === 'Data (raw)') return payload;
    return new Html(table(b));
  });
