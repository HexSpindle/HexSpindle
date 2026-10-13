// Magic hints for extractors: suggested when a longer text contains several of the thing they pull out.
import { analyses, count, IPV4, URL_RX } from '../../core/magic-detect.js';

// An extractor is pointless on a bare value, so the text must have other content around the matches.
const within = (pattern, minimum, fit) => ({ isText, head }) => isText && /\s/.test(head) && count(head, pattern) >= minimum ? fit : null;

analyses('Extract IP addresses', within(IPV4, 3, 0.55));
analyses('Extract URLs', within(URL_RX, 2, 0.55));
analyses('Extract Email addresses', within(/\b[\w.+-]+@[\w-]+(?:\.[\w-]+)+\b/g, 2, 0.55));
analyses('Extract MAC addresses', within(/\b[0-9a-f]{2}(?:[:-][0-9a-f]{2}){5}\b/gi, 2, 0.55));
analyses('Extract hashes', within(/\b(?:[a-f0-9]{32}|[a-f0-9]{40}|[a-f0-9]{64})\b/gi, 2, 0.55));
analyses('Extract dates', within(/\b\d{4}-\d{2}-\d{2}\b|\b\d{1,2}\/\d{1,2}\/\d{4}\b/g, 3, 0.45));
analyses('Extract file paths', within(/\b[A-Za-z]:\\[\w\\. -]{4,}|(?:^|\s)\/(?:[\w.-]+\/){2,}[\w.-]+/g, 3, 0.45));
analyses('Extract Bitcoin addresses', within(/\b(?:bc1[a-z0-9]{25,60}|[13][a-km-zA-HJ-NP-Z1-9]{25,34})\b/g, 1, 0.5));
// Base64 blobs embedded in other text are a common place for a payload to hide.
analyses('Extract Base64 strings', within(/(?:^|[^A-Za-z0-9+/])[A-Za-z0-9+/]{40,}={0,2}(?![A-Za-z0-9+/])/g, 1, 0.6));
analyses('Extract IOCs', ({ isText, head }) => {
  if (!isText || !/\s/.test(head)) return null;
  const kinds = [IPV4, URL_RX, /\b[a-f0-9]{32,64}\b/gi, /\b[\w.+-]+@[\w-]+\.[\w.-]+\b/g, /CVE-\d{4}-\d{4,}/gi].filter(rx => count(head, rx) > 0).length;
  return kinds >= 2 ? 0.65 : null;
});
