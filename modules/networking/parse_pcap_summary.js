import { module } from './_cat.js';
import { A } from '../../core/registry.js';

function readPcap(data) {
  const dv = new DataView(data.buffer, data.byteOffset, data.byteLength);
  const magic = data.subarray(0, 4);
  const m = [...magic].map(b => b.toString(16).padStart(2, '0')).join('');
  let little, nano;
  if (m === 'a1b2c3d4') { little = false; nano = false; }
  else if (m === 'd4c3b2a1') { little = true; nano = false; }
  else if (m === 'a1b23c4d') { little = false; nano = true; }
  else if (m === '4d3cb2a1') { little = true; nano = true; }
  else throw new Error('Not a classic PCAP file (magic number not recognised; PCAPNG is not supported)');
  const linktype = dv.getUint32(20, little);
  let i = 24;
  const pkts = [];
  while (i + 16 <= data.length) {
    const tsSec = dv.getUint32(i, little), tsUsec = dv.getUint32(i + 4, little);
    const inclLen = dv.getUint32(i + 8, little), origLen = dv.getUint32(i + 12, little);
    i += 16;
    const pkt = data.subarray(i, i + inclLen);
    i += inclLen;
    pkts.push([tsSec + tsUsec / (nano ? 1e9 : 1e6), origLen, pkt]);
  }
  return { linktype, pkts };
}

function parseEthIp(pkt, linktype) {
  const off = linktype === 1 ? 14 : linktype === 101 ? 0 : null;
  if (off === null || pkt.length < off + 20) return null;
  if (linktype === 1) {
    const ethertype = (pkt[12] << 8) | pkt[13];
    if (ethertype === 0x86dd) return null; // skip IPv6 detail for this simple summary
    if (ethertype !== 0x0800) return null;
  }
  const ip = pkt.subarray(off);
  if (ip.length < 20 || (ip[0] >> 4) !== 4) return null;
  const ihl = (ip[0] & 15) * 4;
  const proto = ip[9];
  const src = `${ip[12]}.${ip[13]}.${ip[14]}.${ip[15]}`;
  const dst = `${ip[16]}.${ip[17]}.${ip[18]}.${ip[19]}`;
  let sport = null, dport = null;
  if ((proto === 6 || proto === 17) && ip.length >= ihl + 4) {
    sport = (ip[ihl] << 8) | ip[ihl + 1];
    dport = (ip[ihl + 2] << 8) | ip[ihl + 3];
  }
  return { src, dst, proto, sport, dport, len: ip.length };
}

function bump(map, key) { map.set(key, (map.get(key) || 0) + 1); }
function mostCommon(map, n) {
  return [...map.entries()].map((e, idx) => [e, idx]).sort((a, b) => b[0][1] - a[0][1] || a[1] - b[1]).slice(0, n).map(([e]) => e);
}

module('Parse PCAP Summary', 'Summarises a classic (libpcap) capture file: packet count, duration, protocol breakdown, top talkers and conversations.',
  [A.number('Top N', 10, 1, 100)],
  (data, topn) => {
    topn = Math.trunc(topn);
    const { linktype, pkts } = readPcap(data);
    if (!pkts.length) return 'No packets found.';
    const protoNames = { 1: 'ICMP', 6: 'TCP', 17: 'UDP', 2: 'IGMP', 47: 'GRE', 50: 'ESP' };
    const protos = new Map(), talkers = new Map(), convos = new Map(), ports = new Map();
    let parsed = 0;
    for (const [, , pkt] of pkts) {
      const r = parseEthIp(pkt, linktype);
      if (!r) continue;
      parsed++;
      bump(protos, protoNames[r.proto] || `proto ${r.proto}`);
      bump(talkers, r.src);
      bump(talkers, r.dst);
      bump(convos, `${r.src}\u0000${r.dst}`);
      if (r.dport) bump(ports, r.dport);
    }
    const t0 = pkts[0][0], t1 = pkts[pkts.length - 1][0];
    const totalBytes = pkts.reduce((s, p) => s + p[1], 0);
    const out = [`Packets: ${pkts.length} (${parsed} IPv4 parsed)`, `Duration: ${(t1 - t0).toFixed(3)} s`,
      `Total bytes (on wire): ${totalBytes.toLocaleString('en-US')}`, `Link type: ${linktype}`, '', 'Protocols:'];
    out.push(...mostCommon(protos, Infinity).map(([k, v]) => `  ${k}: ${v}`));
    out.push('', `Top ${topn} talkers (by packet count):`, ...mostCommon(talkers, topn).map(([k, v]) => `  ${k}: ${v}`));
    out.push('', `Top ${topn} conversations:`, ...mostCommon(convos, topn).map(([k, v]) => { const [a, b] = k.split('\u0000'); return `  ${a} <-> ${b}: ${v}`; }));
    out.push('', `Top ${topn} destination ports:`, ...mostCommon(ports, topn).map(([k, v]) => `  ${k}: ${v}`));
    return out.join('\n');
  });
