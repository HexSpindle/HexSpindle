import { module } from './_cat.js';
import { A } from '../../core/registry.js';
import { rawOrHex, hexSep } from './_packet.js';

// IANA TCP option kinds (tcp-parameters.xhtml). `length: false` marks the two
// single-byte options, which carry no Length or Value field.
const OPTION_KINDS = {
  0: { name: 'End of Option List', length: false },
  1: { name: 'No-Operation', length: false },
  2: { name: 'Maximum Segment Size', length: true },
  3: { name: 'Window Scale', length: true, parser: windowScaleParser },
  4: { name: 'SACK Permitted', length: true },
  5: { name: 'SACK', length: true },
  6: { name: 'Echo (obsoleted by option 8)', length: true },
  7: { name: 'Echo Reply (obsoleted by option 8)', length: true },
  8: { name: 'Timestamps', length: true, parser: timestampParser },
  9: { name: 'Partial Order Connection Permitted (obsolete)', length: true },
  10: { name: 'Partial Order Service Profile (obsolete)', length: true },
  11: { name: 'CC (obsolete)', length: true },
  12: { name: 'CC.NEW (obsolete)', length: true },
  13: { name: 'CC.ECHO (obsolete)', length: true },
  14: { name: 'TCP Alternate Checksum Request (obsolete)', length: true, parser: alternateChecksumParser },
  15: { name: 'TCP Alternate Checksum Data (obsolete)', length: true },
  16: { name: 'Skeeter', length: true },
  17: { name: 'Bubba', length: true },
  18: { name: 'Trailer Checksum Option', length: true },
  19: { name: 'MD5 Signature Option (obsoleted by option 29)', length: true },
  20: { name: 'SCPS Capabilities', length: true },
  21: { name: 'Selective Negative Acknowledgements', length: true },
  22: { name: 'Record Boundaries', length: true },
  23: { name: 'Corruption experienced', length: true },
  24: { name: 'SNAP', length: true },
  25: { name: 'Unassigned (released 2000-12-18)', length: true },
  26: { name: 'TCP Compression Filter', length: true },
  27: { name: 'Quick-Start Response', length: true },
  28: { name: 'User Timeout Option (also, other known unauthorized use)', length: true },
  29: { name: 'TCP Authentication Option (TCP-AO)', length: true },
  30: { name: 'Multipath TCP (MPTCP)', length: true },
  69: { name: 'Encryption Negotiation (TCP-ENO)', length: true },
  70: { name: 'Reserved (known unauthorized use without proper IANA assignment)', length: true },
  76: { name: 'Reserved (known unauthorized use without proper IANA assignment)', length: true },
  77: { name: 'Reserved (known unauthorized use without proper IANA assignment)', length: true },
  78: { name: 'Reserved (known unauthorized use without proper IANA assignment)', length: true },
  253: { name: 'RFC3692-style Experiment 1 (also improperly used for shipping products) ', length: true },
  254: { name: 'RFC3692-style Experiment 2 (also improperly used for shipping products) ', length: true },
};

function alternateChecksumParser(d) {
  const lookup = { 0: 'TCP Checksum', 1: "8-bit Fletchers's algorithm", 2: "16-bit Fletchers's algorithm", 3: 'Redundant Checksum Avoidance' }[d[0]];
  return `${lookup} (0x${hexSep(d)})`;
}

function timestampParser(d) {
  if (d.length !== 8) return `Error: Timestamp field should be 8 bytes long (received 0x${hexSep(d)})`;
  return { 'Current Timestamp': bigDec(d.subarray(0, 4)), 'Echo Reply': bigDec(d.subarray(4, 8)) };
}

function windowScaleParser(d) {
  if (d.length !== 1) return `Error: Window Scale should be one byte long (received 0x${hexSep(d)})`;
  return { 'Shift count': d[0], Multiplier: 1 << d[0] };
}

/** 32-bit and larger fields are shown as a decimal string so no precision is lost. */
function bigDec(bytes) {
  let v = 0n;
  for (const b of bytes) v = (v << 8n) | BigInt(b);
  return v.toString();
}

function readInt(b, off, n) {
  let v = 0;
  for (let i = 0; i < n; i++) v = (v * 256) + (b[off + i] || 0);
  return v;
}

module('Parse TCP segment', 'Decodes a TCP header, its options and payload, as JSON.', [A.select('Input format', ['Hex', 'Raw'])],
  (data, fmt) => {
    const b = rawOrHex(data, fmt);
    if (b.length < 20) throw new Error('Need at least 20 bytes for a TCP Header');
    const flagBits = ((b[12] & 0x0f) << 8) | b[13];
    const dataOffset = b[12] >> 4;
    const windowSize = readInt(b, 14, 2);
    const out = {
      'Source port': readInt(b, 0, 2),
      'Destination port': readInt(b, 2, 2),
      'Sequence number': bigDec(b.subarray(4, 8)),
      'Acknowledgement number': readInt(b, 8, 4),
      'Data offset': dataOffset,
      Flags: {
        Reserved: ((flagBits >> 9) & 7).toString(2).padStart(3, '0'),
        NS: (flagBits >> 8) & 1,
        CWR: (flagBits >> 7) & 1,
        ECE: (flagBits >> 6) & 1,
        URG: (flagBits >> 5) & 1,
        ACK: (flagBits >> 4) & 1,
        PSH: (flagBits >> 3) & 1,
        RST: (flagBits >> 2) & 1,
        SYN: (flagBits >> 1) & 1,
        FIN: flagBits & 1,
      },
      'Window size': windowSize,
      Checksum: '0x' + hexSep(b.subarray(16, 18)),
      'Urgent pointer': '0x' + hexSep(b.subarray(18, 20)),
    };

    let i = 20;
    let windowScaleShift = 0;
    if (dataOffset > 5) {
      let remaining = dataOffset * 4 - 20;
      const options = {};
      while (remaining > 0) {
        const kind = b[i] || 0; i += 1;
        const option = { Kind: kind };
        const opt = Object.prototype.hasOwnProperty.call(OPTION_KINDS, kind) ? OPTION_KINDS[kind] : { name: 'Reserved', length: true };
        if (opt.length) {
          option.Length = b[i] || 0; i += 1;
          if (option.Length > 2) {
            const payload = b.subarray(i, i + option.Length - 2);
            i += option.Length - 2;
            if (opt.parser) option.Value = opt.parser(payload);
            else option.Value = option.Length <= 6 ? readInt(payload, 0, payload.length) : '0x' + hexSep(payload);
            if (kind === 3 && option.Value) windowScaleShift = option.Value['Shift count'];
          }
        }
        options[opt.name] = option;
        remaining -= option.Length || 1;
      }
      out.Options = options;
    }
    if (i < b.length) out.Data = '0x' + hexSep(b.subarray(i));

    out['Data offset'] = `${dataOffset} (${dataOffset * 4} bytes)`;
    out['Window size'] = `${windowSize} (Scaled: ${BigInt(windowSize) << BigInt(windowScaleShift)})`;
    return JSON.stringify(out, null, 4);
  });
