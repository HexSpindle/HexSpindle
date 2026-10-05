import { module } from './_cat.js';
import { splitMessage, splitHeaders, getHeader, getAllHeaders, parseAddr, parseDateToDatetime } from './_email.js';

module('Parse Email Headers', 'Analyses email headers: the full Received hop chain with delays, SPF/DKIM/DMARC results, and From/Reply-To/Return-Path mismatches that suggest spoofing.', [],
  (t) => {
    const headers = splitHeaders(splitMessage(t).headersBlock);
    const out = [];
    for (const h of ['From', 'To', 'Reply-To', 'Return-Path', 'Subject', 'Date', 'Message-ID']) {
      const v = getHeader(headers, h);
      if (v) out.push(`${h}: ${v}`);
    }
    const frm = parseAddr(getHeader(headers, 'From') || '')[1];
    const reply = parseAddr(getHeader(headers, 'Reply-To') || '')[1];
    const retpath = parseAddr(getHeader(headers, 'Return-Path') || '')[1];
    const frmDom = frm.includes('@') ? frm.split('@').pop().toLowerCase() : '';
    const mismatches = [];
    if (reply && reply.split('@').pop().toLowerCase() !== frmDom) mismatches.push(`Reply-To domain (${reply.split('@').pop()}) differs from From domain (${frmDom})`);
    if (retpath && retpath.split('@').pop().toLowerCase() !== frmDom) mismatches.push(`Return-Path domain (${retpath.split('@').pop()}) differs from From domain (${frmDom})`);
    if (mismatches.length) { out.push('\nPossible spoofing indicators:'); out.push(...mismatches.map(m => `  - ${m}`)); }
    for (const name of ['Authentication-Results', 'Received-SPF', 'ARC-Authentication-Results']) {
      for (const v of getAllHeaders(headers, name)) {
        const spf = /spf=(\w+)/.exec(v), dkim = /dkim=(\w+)/.exec(v), dmarc = /dmarc=(\w+)/.exec(v);
        const bits = [['SPF', spf], ['DKIM', dkim], ['DMARC', dmarc]].filter(([, m]) => m).map(([n, m]) => `${n}=${m[1]}`);
        if (bits.length) out.push(`\n${name}: ` + bits.join(', '));
      }
    }
    const received = getAllHeaders(headers, 'Received');
    if (received.length) {
      out.push(`\nReceived chain (${received.length} hop(s), bottom = origin, top = final):`);
      const times = [];
      const reversed = [...received].reverse();
      reversed.forEach((r, i) => {
        const m = /;\s*(.+)$/.exec(r.trim());
        let dt = null;
        if (m) dt = parseDateToDatetime(m[1].trim());
        times.push(dt);
        const frmM = /from\s+([^\s;]+)/.exec(r);
        const byM = /by\s+([^\s;]+)/.exec(r);
        let delay = '';
        if (dt && i > 0 && times[i - 1]) {
          const secs = (dt.ms - times[i - 1].ms) / 1000;
          delay = secs >= 0 ? `  (+${secs.toFixed(1)}s)` : `  (${secs.toFixed(1)}s, out of order)`;
        }
        out.push(`  Hop ${i + 1}: from ${frmM ? frmM[1] : '?'} by ${byM ? byM[1] : '?'}` + (dt ? `  at ${dt.iso}` : '') + delay);
      });
    }
    return out.join('\n');
  }, { text: true });
