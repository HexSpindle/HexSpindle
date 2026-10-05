import { module } from './_cat.js';

const CROCKFORD = '0123456789ABCDEFGHJKMNPQRSTVWXYZ';
const V1V6_OFFSET = 122192928000000000n; // 100ns ticks between 1582-10-15 and 1970-01-01

function isoUtc(secs) {
  const flo = Math.floor(secs);
  const d = new Date(flo * 1000);
  const micro = Math.round((secs - flo) * 1e6);
  const pad = (n, w = 2) => String(n).padStart(w, '0');
  const base = `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}T${pad(d.getUTCHours())}:${pad(d.getUTCMinutes())}:${pad(d.getUTCSeconds())}`;
  return (micro ? `${base}.${String(micro).padStart(6, '0')}` : base) + '+00:00';
}

function parseUlid(s) {
  s = s.trim().toUpperCase();
  if (!/^[0-9A-HJKMNP-TV-Z]{26}$/.test(s)) throw new Error('Not a 26-character ULID');
  let n = 0n;
  for (const c of s) n = n * 32n + BigInt(CROCKFORD.indexOf(c));
  const tsMs = n >> 80n;
  const rand = n & ((1n << 80n) - 1n);
  return `ULID: ${s}\nTimestamp: ${isoUtc(Number(tsMs) / 1000)} (${tsMs} ms since epoch)\nRandomness: ${rand.toString(16).padStart(20, '0')}`;
}

function parseObjectid(s) {
  s = s.trim().toLowerCase();
  if (!/^[0-9a-f]{24}$/.test(s)) throw new Error('Not a 24-character hex ObjectID');
  const ts = parseInt(s.slice(0, 8), 16);
  return `MongoDB ObjectID: ${s}\nTimestamp: ${isoUtc(ts)}\nMachine/process+counter: ${s.slice(8)}`;
}

function parseSnowflake(s, epoch = 1288834974657n, tsBits = 41n, workerBits = 10n, seqBits = 12n) {
  const n = BigInt(s.trim());
  const seq = n & ((1n << seqBits) - 1n);
  const worker = (n >> seqBits) & ((1n << workerBits) - 1n);
  const ts = (n >> (seqBits + workerBits)) + epoch;
  return `Snowflake ID: ${n}\nTimestamp: ${isoUtc(Number(ts) / 1000)} (epoch offset ${epoch})\nWorker/datacenter: ${worker}\nSequence: ${seq}`;
}

function parseUuid(s) {
  const hex = s.trim().replace(/-/g, '').toLowerCase();
  if (!/^[0-9a-f]{32}$/.test(hex)) throw new Error('badly formed hexadecimal UUID string');
  const b = [];
  for (let i = 0; i < 32; i += 2) b.push(parseInt(hex.substr(i, 2), 16));
  const uuidStr = `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
  const version = (b[6] >> 4) & 0xf;
  const variant = (b[8] & 0x80) === 0 ? 'reserved for NCS compatibility'
    : (b[8] & 0x40) === 0 ? 'specified in RFC 4122'
    : (b[8] & 0x20) === 0 ? 'reserved for Microsoft compatibility'
    : 'reserved for future definition';
  const out = [`UUID: ${uuidStr}`, `Version: ${version}`, `Variant: ${variant}`];
  if (version === 1) {
    const timeLow = ((b[0] << 24) | (b[1] << 16) | (b[2] << 8) | b[3]) >>> 0;
    const timeMid = (b[4] << 8) | b[5];
    const timeHiVer = (b[6] << 8) | b[7];
    const ticks = (BigInt(timeHiVer & 0xfff) << 48n) | (BigInt(timeMid) << 32n) | BigInt(timeLow);
    out.push(`Timestamp: ${isoUtc(Number(ticks - V1V6_OFFSET) / 1e7)}`);
    out.push(`Node (often a MAC address): ${b.slice(10, 16).map(x => x.toString(16).padStart(2, '0')).join('')}`);
    out.push(`Clock sequence: ${((b[8] & 0x3f) << 8) | b[9]}`);
  } else if (version === 7) {
    const tsMs = parseInt(hex.slice(0, 12), 16);
    out.push(`Timestamp: ${isoUtc(tsMs / 1000)} (${tsMs} ms since epoch)`);
  } else if (version === 6) {
    const ticks = BigInt('0x' + hex.slice(0, 12) + hex.slice(13, 16));
    out.push(`Timestamp: ${isoUtc(Number(ticks - V1V6_OFFSET) / 1e7)}`);
  }
  return out.join('\n');
}

module('UUID / ULID / Snowflake Inspector', 'Identifies and decodes a UUID (v1/v4/v6/v7), ULID, Twitter/Discord-style Snowflake ID or MongoDB ObjectID, extracting the embedded timestamp where present.',
  [],
  (t) => {
    const s = t.trim();
    const errs = [];
    const candidates = [
      ['UUID', parseUuid, /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/.test(s)],
      ['ULID', parseUlid, /^[0-9A-Za-z]{26}$/.test(s)],
      ['ObjectID', parseObjectid, /^[0-9a-fA-F]{24}$/.test(s)],
      ['Snowflake', parseSnowflake, /^\d{10,20}$/.test(s)],
    ];
    for (const [name, fn, cond] of candidates) {
      if (!cond) continue;
      try { return fn(s); } catch (e) { errs.push(`${name}: ${e.message}`); }
    }
    throw new Error('Not recognised as a UUID, ULID, Snowflake ID or MongoDB ObjectID' + (errs.length ? '; ' + errs.join('; ') : ''));
  }, { text: true });
