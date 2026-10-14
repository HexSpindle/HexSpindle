import { module } from './_cat.js';

const top = (map, n = 15) => [...map.entries()].sort((a, b) => b[1] - a[1] || String(a[0]).localeCompare(String(b[0]))).slice(0, n);
const block = (title, map, total) => { const rows = top(map); return `${title} (${map.size} distinct)\n${rows.map(([k, v]) => `${String(v).padStart(7)}  ${k}`).join('\n')}${map.size > rows.length ? `\n         … and ${map.size - rows.length} more` : ''}`; };
const bump = (map, key) => { if (key === undefined || key === null || key === '') return; map.set(key, (map.get(key) || 0) + 1); };

module('Summarise Suricata EVE',
  'Summarises Suricata eve.json (the EVE JSON alert and event log), one event per line (JSONL). Counts events by type, lists the triggered alert signatures with their severity, '
  + 'and the busiest source and destination addresses, ports, protocols, DNS queries, TLS SNI names and HTTP hosts. Malformed lines are counted but skipped.',
  [],
  (t) => {
    const lines = t.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
    const byType = new Map(), alerts = new Map(), categories = new Map(), srcIp = new Map(), dstIp = new Map(), dstPort = new Map(), proto = new Map(), dns = new Map(), sni = new Map(), httpHost = new Map();
    const severity = new Map();
    let parsed = 0, malformed = 0;
    let first, last;
    for (const line of lines) {
      let e; try { e = JSON.parse(line); } catch { malformed++; continue; }
      if (typeof e !== 'object' || !e) { malformed++; continue; }
      parsed++;
      bump(byType, e.event_type);
      if (e.timestamp) { if (!first || e.timestamp < first) first = e.timestamp; if (!last || e.timestamp > last) last = e.timestamp; }
      bump(srcIp, e.src_ip); bump(dstIp, e.dest_ip); bump(dstPort, e.dest_port); bump(proto, e.proto);
      if (e.event_type === 'alert' && e.alert) { bump(alerts, `[sev ${e.alert.severity ?? '?'}] ${e.alert.signature || e.alert.signature_id}`); bump(categories, e.alert.category); bump(severity, e.alert.severity); }
      if (e.event_type === 'dns' && e.dns) bump(dns, e.dns.rrname || e.dns.query?.[0]?.rrname);
      if (e.tls) bump(sni, e.tls.sni);
      if (e.http) bump(httpHost, e.http.hostname);
    }
    if (!parsed) throw new Error('No Suricata EVE JSON events found (one JSON object per line)');
    const out = [`Suricata EVE: ${parsed} events${malformed ? `, ${malformed} malformed lines skipped` : ''}${first ? `\nTime range: ${first} to ${last}` : ''}`,
      block('Events by type', byType)];
    if (alerts.size) out.push(block('Alert signatures', alerts), block('Alert categories', categories), `Alerts by severity: ${top(severity, 10).map(([k, v]) => `${k}=${v}`).join(', ')} (1 is most severe)`);
    out.push(block('Top source addresses', srcIp), block('Top destination addresses', dstIp), block('Top destination ports', dstPort), block('Protocols', proto));
    if (dns.size) out.push(block('Top DNS queries', dns));
    if (sni.size) out.push(block('Top TLS SNI names', sni));
    if (httpHost.size) out.push(block('Top HTTP hosts', httpHost));
    return out.join('\n\n');
  }, { text: true, aliases: ['suricata', 'eve.json', 'eve json', 'ids alerts', 'nsm'] });
