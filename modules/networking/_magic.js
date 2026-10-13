// Magic hints for networking operations.
import { analyses, decodes, count, printableAscii } from '../../core/magic-detect.js';

// ---- Decoders ------------------------------------------------------------------------------------

decodes('Decode NetBIOS Name', ({ single, compact }) => single && /^[A-P]+$/.test(compact) && compact.length % 2 === 0
  ? (compact.length === 32 ? { fit: 0.9, verify: printableAscii } : compact.length >= 16 ? { fit: 0.5, needsQuality: true, verify: printableAscii } : null) : null);

decodes('Dechunk HTTP response', ({ isText, text }) => isText && /^[0-9a-fA-F]{1,8}\r?\n/.test(text) && /\r?\n0(?:\r?\n)*$/.test(text) ? 0.9 : null);

// Only worth a stage when the body is something to decode: compressed, chunked or binary.
decodes('Strip HTTP headers', ({ bytes, isText }) => {
  const head = String.fromCharCode(...bytes.subarray(0, 4096));
  if (!/^(?:HTTP\/\d(?:\.\d)? \d{3}[^\r\n]*|[A-Z]{3,7} \S+ HTTP\/\d(?:\.\d)?)\r?\n/.test(head)) return null;
  const end = head.search(/\r?\n\r?\n/);
  if (end < 0 || bytes.length - end <= 4) return null;
  return !isText || /^(?:content-encoding|transfer-encoding):\s*(?:gzip|deflate|br|zstd|chunked)/im.test(head.slice(0, end)) ? 0.85 : null;
});

// ---- Suggested analysis -----------------------------------------------------------------------------

const line = (pattern, fit) => ({ isText, text }) => isText && text.length < 4096 && !/\n/.test(text) && pattern.test(text) ? fit : null;

analyses('Parse User Agent', line(/^(?:Mozilla\/\d\.\d \(|(?:curl|Wget|python-requests|okhttp|Go-http-client|PostmanRuntime)\/)/, 0.9));
analyses('Parse URI', ({ isText, text }) => isText && /^[a-z][a-z0-9+.-]*:\/\/\S+$/i.test(text) ? (/[?#@]|:\d{2,5}(?:\/|$)/.test(text) ? 0.75 : 0.5) : null);
analyses('Parse IPv6 address', line(/^(?=.*:.*:)(?:[0-9a-f]{0,4}:){2,7}[0-9a-f]{0,4}(?:%\w+)?$/i, 0.85));
analyses('Parse IP range', line(/^\d{1,3}(?:\.\d{1,3}){3}(?:\/\d{1,2}| ?- ?\d{1,3}(?:\.\d{1,3}){3})$|^[0-9a-f:]+\/\d{1,3}$/i, 0.9));
analyses('Parse Email Headers', ({ isText, head }) => isText && /^Received: /m.test(head) && /^(?:From|Subject|Message-ID|Return-Path): /mi.test(head) ? 0.9 : null);
analyses('HTTP Security Header Audit', ({ isText, head }) => isText && /^HTTP\/\d/.test(head) && count(head, /^(?:content-type|server|set-cookie|strict-transport-security|x-frame-options|content-security-policy|cache-control|date):/gim) >= 2 ? 0.8 : null);

analyses('Parse PCAP Summary', ({ at }) => at('\xd4\xc3\xb2\xa1') || at('\xa1\xb2\xc3\xd4') ? 0.95 : null);

// An IPv4 header announces its own total length, which has to agree with the data for this to be one.
const ipv4Length = bytes => bytes.length >= 20 && bytes[0] >= 0x45 && bytes[0] <= 0x4f && ((bytes[2] << 8) | bytes[3]) === bytes.length;
analyses('Parse IPv4 header', ({ isText, bytes, single, compact }) => {
  if (!isText) return ipv4Length(bytes) ? { fit: 0.85, args: ['Raw', 'Table'] } : null;
  if (!single || !/^4[5-9a-f][0-9a-f]{38,}$/i.test(compact) || compact.length % 2) return null;
  return parseInt(compact.slice(4, 8), 16) === compact.length / 2 ? { fit: 0.85, args: ['Hex', 'Table'] } : null;
});
analyses('Parse TLS record', ({ isText, bytes }) => !isText && bytes.length >= 6 && bytes[0] >= 0x14 && bytes[0] <= 0x17 && bytes[1] === 3 && bytes[2] <= 4
  && ((bytes[3] << 8) | bytes[4]) <= bytes.length - 5 ? { fit: 0.8, args: ['Raw'] } : null);
