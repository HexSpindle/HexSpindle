'use strict';
/* HexSpindle web UI - vanilla JS, no build step. Everything runs client-side: the recipe engine,
 * every operation, and Magic all execute in this browser tab - nothing is sent to any server. The
 * network calls are limited to explicit user actions: Suggest, network-enabled recipe operations,
 * and their connection tests. API credentials are user supplied and are never embedded in HexSpindle. */
import { MODULES, describe, CATEGORY_LABELS } from './core/registry.js';
import { FORENSICS_EVIDENCE_GUIDE } from './core/forensics-evidence-guide.js';
import { bake as engineBake } from './core/engine.js';
import { normaliseRecipe, parseRecipeText, exportRecipeText } from './core/recipe-interop-parallel.js';
import { AI_PROVIDERS, loadAISetting, saveAISetting, deleteAISetting, migrateLegacyAnthropicKey,
  maskAIKey, verifyAIConnection, requestAIText, readableAIError } from './core/ai-suggest.js';
import { buildCandidateCatalogue, buildPlanningPrompt, buildConfigurationPrompt,
  validateAIPlan, validateAIRecipe } from './core/ai-recipe-builder.js';
import { search as magicSearch } from './core/magic.js';
import { loadGeoIpBundle, summarizeGeoIpBundle, dropGeoIpBundle } from './modules/networking/_geoip_store.js';
import { getServiceCredential, setServiceCredential, clearServiceCredential } from './core/service-credentials.js';
import './modules/index.js';

// ---------------------------------------------------------------- helpers
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
function el(tag, props, ...kids) {
  const e = document.createElement(tag);
  for (const [k, v] of Object.entries(props || {})) {
    if (k === 'class') e.className = v;
    else if (k === 'html') e.innerHTML = v;
    else if (k.startsWith('on')) e.addEventListener(k.slice(2), v);
    else if (k === 'value' || k === 'checked' || k === 'selected' || k === 'disabled') e[k] = v;
    else if (v === true) e.setAttribute(k, '');
    else if (v !== false && v != null) e.setAttribute(k, v);
  }
  for (const c of kids.flat(3)) { if (c == null || c === false) continue; e.append(c.nodeType ? c : document.createTextNode(c)); }
  return e;
}
const LS = {
  get(k, d) { try { const v = localStorage.getItem('df.' + k); return v == null ? d : JSON.parse(v); } catch { return d; } },
  set(k, v) { try { localStorage.setItem('df.' + k, JSON.stringify(v)); } catch { /* storage unavailable */ } },
  remove(k) { try { localStorage.removeItem('df.' + k); } catch { /* storage unavailable */ } },
};
const debounce = (fn, ms) => { let t; return (...a) => { clearTimeout(t); t = setTimeout(() => fn(...a), ms); }; };
const fmtBytes = n => n < 1024 ? `${n} B` : n < 1048576 ? `${(n / 1024).toFixed(1)} KB` : `${(n / 1048576).toFixed(2)} MB`;
const countNl = u => { let n = 0; for (let i = 0; i < u.length; i++) if (u[i] === 10) n++; return n; };
const esc = s => s.replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

const ICONS = {
  search: '<circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/>', spark: '<path d="M12 3l2 5 5 2-5 2-2 5-2-5-5-2 5-2z"/><path d="M19 16l.8 2 2 .8-2 .8-.8 2-.8-2-2-.8 2-.8z"/>',
  save: '<path d="M5 3h11l3 3v15H5z"/><path d="M8 3v6h7V3M8 21v-7h8v7"/>', sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M2 12h2M20 12h2M5 5l1.5 1.5M17.5 17.5 19 19M5 19l1.5-1.5M17.5 6.5 19 5"/>',
  moon: '<path d="M20 14.5A8 8 0 0 1 9.5 4 8 8 0 1 0 20 14.5z"/>', help: '<circle cx="12" cy="12" r="9"/><path d="M9.5 9.5a2.5 2.5 0 1 1 3.5 2.3c-.7.4-1 1-1 1.7M12 17v.5"/>',
  book: '<path d="M4 4.5A2.5 2.5 0 0 1 6.5 2H20v17H6.5A2.5 2.5 0 0 0 4 21.5z"/><path d="M4 19.5V4.5"/><path d="M20 19H6.5a2.5 2.5 0 0 0 0 5H20"/>',
  compare: '<rect x="3" y="4" width="8" height="16" rx="1.5"/><rect x="13" y="4" width="8" height="16" rx="1.5"/><path d="M11 9l2 3-2 3"/>',
  ai: '<path d="M12 3l1.6 4.4L18 9l-4.4 1.6L12 15l-1.6-4.4L6 9l4.4-1.6z"/><path d="M19 14.5l.8 2.2 2.2.8-2.2.8-.8 2.2-.8-2.2-2.2-.8 2.2-.8z"/>',
  grid: '<rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/>',
  layers: '<path d="m12 3 9 5-9 5-9-5z"/><path d="m3 13 9 5 9-5"/>', undo: '<path d="M9 14 4 9l5-5"/><path d="M4 9h10a6 6 0 0 1 0 12h-3"/>',
  redo: '<path d="m15 14 5-5-5-5"/><path d="M20 9H10a6 6 0 0 0 0 12h3"/>', parallel: '<path d="M5 5v4a3 3 0 0 0 3 3h11"/><path d="M5 19v-4a3 3 0 0 1 3-3"/><path d="m16 9 3 3-3 3"/>',
  trash: '<path d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3"/>', step: '<path d="M6 4l10 8-10 8z"/><path d="M19 4v16"/>', flame: '<path d="M12 2s5 4.5 5 10a5 5 0 0 1-10 0c0-2 1-3 2-4 0 2 1 3 2 3 0-3-1-5 1-9z"/>',
  in: '<path d="M12 3v12M7 10l5 5 5-5M4 21h16"/>', out: '<path d="M12 15V3M7 8l5-5 5 5M4 21h16"/>', paste: '<rect x="6" y="5" width="12" height="16" rx="2"/><path d="M9 5V3h6v2"/>',
  open: '<path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>', wrap: '<path d="M3 6h18M3 12h14a3 3 0 0 1 0 6h-4M3 18h6"/><path d="m11 15-2 3 2 3"/>',
  wand: '<path d="m4 20 11-11"/><path d="m14 4 1 2 2 1-2 1-1 2-1-2-2-1 2-1zM19 12l.7 1.3 1.3.7-1.3.7-.7 1.3-.7-1.3-1.3-.7 1.3-.7z"/>', copy: '<rect x="9" y="9" width="11" height="11" rx="2"/><path d="M5 15V6a2 2 0 0 1 2-2h8"/>',
  download: '<path d="M12 4v12M7 11l5 5 5-5M4 20h16"/>', swap: '<path d="M7 4 3 8l4 4M3 8h14M17 20l4-4-4-4M21 16H7"/>', plus: '<path d="M12 5v14M5 12h14"/>', star: '<path d="m12 3 2.7 5.6 6.1.9-4.4 4.3 1 6.1-5.4-2.9-5.4 2.9 1-6.1-4.4-4.3 6.1-.9z"/>',
  chev: '<path d="m9 6 6 6-6 6"/>', grip: '<circle cx="9" cy="6" r="1"/><circle cx="15" cy="6" r="1"/><circle cx="9" cy="12" r="1"/><circle cx="15" cy="12" r="1"/><circle cx="9" cy="18" r="1"/><circle cx="15" cy="18" r="1"/>',
  eye: '<path d="M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/>', flag: '<path d="M5 21V4M5 4h11l-2 4 2 4H5"/>', up: '<path d="m6 15 6-6 6 6"/>', down: '<path d="m6 9 6 6 6-6"/>',
  x: '<path d="M6 6l12 12M18 6 6 18"/>', power: '<path d="M12 3v9"/><path d="M6.3 7a8 8 0 1 0 11.4 0"/>', file: '<path d="M6 3h8l5 5v13H6z"/><path d="M14 3v5h5"/>', lock: '<rect x="5" y="11" width="14" height="10" rx="2"/><path d="M8 11V7a4 4 0 0 1 8 0v4"/>',
};
function icon(n) { return el('span', { class: 'ico', html: `<svg viewBox="0 0 24 24">${ICONS[n] || ''}</svg>` }); }
function hydrateIcons(root = document) { $$('[data-i]', root).forEach(e => { if (!e.firstChild) e.innerHTML = `<svg viewBox="0 0 24 24">${ICONS[e.dataset.i] || ''}</svg>`; }); }

const b64enc = u8 => { let s = ''; for (let i = 0; i < u8.length; i += 0x8000) s += String.fromCharCode.apply(null, u8.subarray(i, i + 0x8000)); return btoa(s); };
const b64dec = s => { const bin = atob(s); const u = new Uint8Array(bin.length); for (let i = 0; i < bin.length; i++) u[i] = bin.charCodeAt(i); return u; };
// Control pictures preserve character positions while making invisible bytes visible.
// These substitutions are for the editor only; recipes and downloads use original bytes.
function visibleControls(s) {
  return s.replace(/[\x00-\x08\x0b-\x1f\x7f]/g, c =>
    String.fromCharCode(c.charCodeAt(0) === 127 ? 0x2421 : 0x2400 + c.charCodeAt(0)));
}
function restoreControls(s) {
  return s.replace(/[\u2400-\u2408\u240b-\u241f\u2421]/g, c =>
    String.fromCharCode(c.charCodeAt(0) === 0x2421 ? 127 : c.charCodeAt(0) - 0x2400));
}
// Preserve literal Unicode control-picture characters when editing. Only
// the parts of the display that already represented real control bytes are
// mapped back; newly typed characters are treated as literal text.
function updatedInputText(inp, display) {
  const previous = inp._displayText ?? '';
  const raw = inp._rawText ?? '';
  let left = 0, right = 0;
  while (left < previous.length && left < display.length && previous[left] === display[left]) left++;
  while (right < previous.length - left && right < display.length - left &&
    previous[previous.length - right - 1] === display[display.length - right - 1]) right++;
  const result = raw.slice(0, left) + display.slice(left, display.length - right) + raw.slice(previous.length - right);
  inp._displayText = display;
  inp._rawText = result;
  return result;
}
function decodeText(u8, enc) {
  if (enc === 'latin1') { let s = ''; for (let i = 0; i < u8.length; i += 0x8000) s += String.fromCharCode.apply(null, u8.subarray(i, i + 0x8000)); return s; }
  if (enc === 'hex') return [...u8].map(b => b.toString(16).padStart(2, '0')).join(' ');
  if (enc === 'base64') return b64enc(u8);
  return new TextDecoder('utf-8').decode(u8);
}
function encodeText(s, enc) {
  if (enc === 'latin1') { const u = new Uint8Array(s.length); for (let i = 0; i < s.length; i++) u[i] = s.charCodeAt(i) & 255; return u; }
  if (enc === 'hex') { const h = s.replace(/0x|\\x|[^0-9a-f]/gi, ''); const u = new Uint8Array(h.length >> 1); for (let i = 0; i < u.length; i++) u[i] = parseInt(h.substr(i * 2, 2), 16); return u; }
  if (enc === 'base64') return b64dec(s.replace(/[^A-Za-z0-9+/=_-]/g, '').replace(/-/g, '+').replace(/_/g, '/'));
  return new TextEncoder().encode(s);
}
function hexdump(u8, limit = 1 << 16) {
  const n = Math.min(u8.length, limit), lines = [];
  for (let i = 0; i < n; i += 16) {
    const row = u8.subarray(i, Math.min(i + 16, n));
    const hex = [...row].map(b => b.toString(16).padStart(2, '0')).join(' ').padEnd(47);
    lines.push(`${i.toString(16).padStart(8, '0')}  ${hex}  |${[...row].map(b => b > 31 && b < 127 ? String.fromCharCode(b) : '.').join('')}|`);
  }
  if (u8.length > n) lines.push(`… ${u8.length - n} more bytes not shown`);
  return lines.join('\n');
}
function sniffImage(u) {
  const s = (a, o = 0) => a.every((v, i) => u[o + i] === v);
  if (s([0x89, 0x50, 0x4e, 0x47])) return 'image/png'; if (s([0xff, 0xd8, 0xff])) return 'image/jpeg'; if (s([0x47, 0x49, 0x46, 0x38])) return 'image/gif';
  if (s([0x42, 0x4d]) && u.length > 30) return 'image/bmp'; if (s([0x52, 0x49, 0x46, 0x46]) && s([0x57, 0x45, 0x42, 0x50], 8)) return 'image/webp';
  if (s([0, 0, 1, 0]) && u.length > 22) return 'image/x-icon';
  const head = new TextDecoder().decode(u.subarray(0, 200)).trimStart(); if (/^(<\?xml[^>]*>\s*)?<svg[\s>]/i.test(head)) return 'image/svg+xml';
  return null;
}
function sniffPdf(u) { return u.length > 4 && u[0] === 0x25 && u[1] === 0x50 && u[2] === 0x44 && u[3] === 0x46 ? 'application/pdf' : null; }
function toast(msg, err) { const t = el('div', { class: 'toast' + (err ? ' err' : '') }, msg); $('#toasts').append(t); setTimeout(() => t.remove(), err ? 5000 : 2200); }
function download(name, data, type = 'application/octet-stream') { const a = el('a', { href: URL.createObjectURL(new Blob([data], { type })), download: name }); document.body.append(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(a.href), 4000); }

// ---------------------------------------------------------------- state
const CAT_HUE = { data_format: 190, encryption_encoding: 320, public_key: 270, arithmetic_logic: 40, networking: 150, language: 215, utils: 95, date_time: 20, extractors: 345, compression: 60, hashing: 0, code_tidy: 240, forensics: 300, multimedia: 170, other: 120, flow_control: 210, favourites: 48 };
// Hand-curated subgroups for the biggest, hardest-to-scan categories. Anything not listed here for a
// given category falls into a trailing "Other" group; categories with no entry stay flat (as before).
const SUBCATS = {
  forensics: [
  ['Windows Event Logs (EVTX)', ['EVTX to JSON', 'EVTX to XML', 'Windows EVTX Metadata Inspector', 'Windows Event Log Summary', 'Windows Event Log Filter', 'Windows Event Log Integrity Analyzer', 'Windows Account & Group Changes', 'Windows Scheduled Task Event Analyzer', 'Windows Process Execution Events', 'Sysmon Persistence Event Analyzer', 'Windows SMB Share Event Analyzer']],
  ['Windows Artifacts & Execution History', ["Windows Prefetch Parser", "NTFS MFT Parser", "NTFS Attribute Inspector", "NTFS Alternate Data Streams Analyzer", "USN Journal Parser", "Windows Registry Hive Inspector", "Amcache Parser", "ShimCache Parser", "UserAssist Decoder", "BAM/DAM Parser", "Windows LNK Parser", "Jump List Parser", "ShellBags Parser", "Windows Recycle Bin Parser", "Zone.Identifier ADS Parser", "OpenSave MRU Analyzer", "RecentDocs Analyzer", "Run Key Analyzer", "Windows Services Registry Analyzer", "Startup Artifact Correlator"]],
  ['Malware & Binary Analysis', ["PE Import Hash (imphash)", "PE Rich Header Parser", "PE Authenticode Inspector", "PE Section Analyzer", "PE Packer Heuristics", "PE Resource Inspector", ".NET Assembly Metadata Parser", ".NET User String Extractor", "Mach-O Header Parser", "Mach-O Code Signature Inspector", "ELF Symbol and Relocation Parser", "ELF Notes and Build-ID Extractor", "Java JAR Metadata Analyzer", "Android APK Manifest Analyzer", "DEX Metadata Parser", "Suspicious Script Analyzer", "Embedded Configuration Extractor"]],
  ['Incident Response & Log Analysis', ["Windows Event ID Explainer", "Sysmon Event Normalizer", "Windows Logon Analyzer", "Kerberos Event Analyzer", "RDP Activity Analyzer", "Windows Service Installation Detector", "Scheduled Task XML Parser", "PowerShell Script Block Analyzer", "Defender Event Log Analyzer", "IIS Log Parser", "Apache/Nginx Access Log Analyzer", "Linux Auth Log Analyzer", "Linux Auditd Parser", "macOS Unified Log JSON Analyzer", "AWS CloudTrail Analyzer", "Azure/Entra Sign-in Log Analyzer", "Microsoft 365 Audit Log Analyzer", "Timeline Builder", "IOC Extractor with Context", "IOC Deduplicator and Normalizer", "Sigma Rule Evaluator (Subset)"]],
  ['Browser Activity & Persistence', ['SQLite WAL Snapshot (ZIP)', "Chrome History Parser", "Firefox History Parser", "Chromium Downloads Parser", "Browser Cookies Metadata Parser", "Chromium Preferences Analyzer", "Chromium Extension Manifest Analyzer", "Firefox Extensions Analyzer", "Windows Timeline ActivitiesCache Parser", "Startup Artifact JSON Normalizer"]],
  ],
  encryption_encoding: [
    ['Modern Symmetric Ciphers', ['AES Decrypt', 'AES Encrypt', 'AES-XTS Decrypt', 'AES-XTS Encrypt', 'Blowfish Decrypt', 'Blowfish Encrypt', 'CAST5 Decrypt', 'CAST5 Encrypt', 'Camellia Decrypt', 'Camellia Encrypt', 'ChaCha20', 'CipherSaber2 Decrypt', 'CipherSaber2 Encrypt', 'DES Decrypt', 'DES Encrypt', 'GOST Kuznechik Decrypt', 'GOST Kuznechik Encrypt', 'GOST Magma Decrypt', 'GOST Magma Encrypt', 'IDEA Decrypt', 'IDEA Encrypt', 'RC2 Decrypt', 'RC2 Encrypt', 'RC4', 'RC4 Drop', 'Salsa20', 'SEED Decrypt', 'SEED Encrypt', 'SM4 Decrypt', 'SM4 Encrypt', 'TEA Decrypt', 'TEA Encrypt', 'Triple DES Decrypt', 'Triple DES Encrypt', 'XTEA Decrypt', 'XTEA Encrypt', 'XXTEA Decrypt', 'XXTEA Encrypt']],
    ['Classical & Pen-and-Paper Ciphers', ['A1Z26 Cipher Decode', 'A1Z26 Cipher Encode', 'ADFGX Cipher Decode', 'ADFGX Cipher Encode', 'ADFGVX Cipher Decode', 'ADFGVX Cipher Encode', 'Affine Cipher Decode', 'Affine Cipher Encode', 'Atbash Cipher', 'Autokey Cipher Decode', 'Autokey Cipher Encode', 'Bacon Cipher Decode', 'Bacon Cipher Encode', 'Beaufort Cipher Decode', 'Beaufort Cipher Encode', 'Bifid Cipher Decode', 'Bifid Cipher Encode', 'Caesar Box Cipher', 'Chaocipher Decode', 'Chaocipher Encode', 'Enigma', 'Four-square Cipher Decode', 'Four-square Cipher Encode', 'Hill Cipher Decode', 'Hill Cipher Encode', 'Homophonic Substitution Decode', 'Homophonic Substitution Encode', 'Myszkowski Transposition Decode', 'Myszkowski Transposition Encode', 'Nihilist Cipher Decode', 'Nihilist Cipher Encode', 'Playfair Decode', 'Playfair Encode', 'Porta Cipher Decode', 'Porta Cipher Encode', 'Rail Fence Cipher Decode', 'Rail Fence Cipher Encode', 'Running Key Cipher Decode', 'Running Key Cipher Encode', 'Solitaire/Pontifex Decode', 'Solitaire/Pontifex Encode', 'Straddling Checkerboard Decode', 'Straddling Checkerboard Encode', 'Substitute', 'Trifid Cipher Decode', 'Trifid Cipher Encode', 'Two-square Cipher Decode', 'Two-square Cipher Encode', 'VIC Cipher Decode', 'VIC Cipher Encode', 'Vigenère Decode', 'Vigenère Encode', 'ROT13', 'ROT13 Brute Force', 'ROT47', 'ROT47 Brute Force', 'XOR', 'XOR Brute Force']],
    ['Key Derivation & Wrapping', ['AES Key Unwrap', 'AES Key Wrap', 'Derive EVP key', 'Derive PBKDF2 key', 'HKDF']],
	['AHEAD Algorithms', ['AES-GCM Encrypt', 'AES-GCM Decrypt', 'AES-CCM Encrypt', 'AES-CCM Decrypt', 'AES-SIV Encrypt', 'AES-SIV Decrypt', 'AES-EAX Encrypt', 'AES-EAX Decrypt', 'ChaCha20-Poly1305 Encrypt', 'ChaCha20-Poly1305 Decrypt', 'XChaCha20-Poly1305 Encrypt', 'XChaCha20-Poly1305 Decrypt']],
    ['Tokens & Sessions', ['Fernet Decrypt', 'Fernet Encrypt', 'Flask Session Decode', 'Flask Session Sign', 'Flask Session Verify', 'JWT Decode', 'JWT Sign', 'JWT Verify']],
  ],
  data_format: [
    ['Numeric Base Encodings', ['From Base', 'To Base', 'From Base32', 'To Base32', 'From Base45', 'To Base45', 'From Base58', 'To Base58', 'From Base62', 'To Base62', 'From Base64', 'To Base64', 'From Base85', 'To Base85', 'From Base92', 'To Base92', 'From Bech32', 'To Bech32', 'From Modhex', 'To Modhex']],
    ['Number & Byte Representations', ['From Binary', 'To Binary', 'From Binary Coded Decimal', 'To Binary Coded Decimal', 'From Decimal', 'To Decimal', 'From Float', 'To Float', 'From Hex', 'To Hex', 'From Octal', 'To Octal', 'From Charcode', 'To Charcode', 'Swap endianness', 'VarInt Decode', 'VarInt Encode']],
    ['Hex & Binary Dumps', ['From Hex Content', 'To Hex Content', 'From Hexdump', 'To Hexdump', 'From COBS', 'To COBS']],
    ['Text Encodings & Entities', ['From HTML Entity', 'To HTML Entity', 'From Quoted Printable', 'To Quoted Printable', 'From Punycode', 'To Punycode', 'URL Decode', 'URL Encode', 'From Braille', 'To Braille', 'From Morse Code', 'To Morse Code', 'Expand alphabet range']],
    ['Structured Data (JSON / YAML / CSV / Config)', ['CSV to JSON', 'JSON to CSV', 'JSON to YAML', 'YAML to JSON', 'Convert Config Format']],
    ['Binary Serialization Formats', ['CBOR Decode', 'CBOR Encode', 'From MessagePack', 'To MessagePack', 'Protobuf Encode', 'Parse TLV', 'To TLV']],
  ],
  hashing: [
    ['Common Hash Functions', ['MD2', 'MD4', 'MD5', 'SHA0', 'SHA1', 'SHA2', 'SHA3', 'RIPEMD', 'Keccak', 'Shake', 'cSHAKE / KMAC / TupleHash / K12', 'BLAKE2b', 'BLAKE2s', 'BLAKE3', 'SM3', 'Streebog (GOST R 34.11-2012)', 'GOST Hash', 'Simple Hash Functions', 'Generate all hashes']],
    ['Password Hashing & KDFs', ['Argon2', 'Argon2 compare', 'Bcrypt', 'Bcrypt compare', 'Bcrypt parse', 'scrypt']],
    ['MACs & Keyed Hashes', ['HMAC', 'CMAC', 'Poly1305', 'SipHash']],
    ['Checksums & CRCs', ['Adler-32 Checksum', 'BSD / SYSV Checksum', 'CRC (custom parameters)', 'CRC-8 Checksum', 'CRC-16 Checksum', 'CRC-24 Checksum', 'CRC-32 Checksum', 'CRC-64 Checksum', 'Fletcher-8 Checksum', 'Fletcher-16 Checksum', 'Fletcher-32 Checksum', 'Fletcher-64 Checksum', 'TCP/IP Checksum', 'Generate all checksums']],
    ['Non-Cryptographic / Fast Hashes', ['MurmurHash2', 'MurmurHash3', 'CityHash', 'xxHash', 'LM Hash', 'NT Hash']],
    ['Fuzzy & Similarity Hashing', ['MinHash Signature', 'Compare MinHash Signatures', 'SimHash', 'Compare SimHashes', 'TLSH (fuzzy hash)', 'Compare TLSH Hashes']],
    ['Analysis', ['Analyse hash']],
  ],
  utils: [
    ['Text Case & Escaping', ['Alternating Caps', 'Convert Leet Speak', 'Get All Casings', 'Swap case', 'To Lower case', 'To Upper case', 'Escape Unicode Characters', 'Unescape Unicode Characters', 'Escape string', 'Unescape string', 'Remove ANSI Escape Codes']],
    ['Line & Byte Tools', ['Add line numbers', 'Remove line numbers', 'Remove null bytes', 'Remove whitespace', 'Pad lines', 'Reverse', 'Head', 'Tail', 'Sort', 'Shuffle', 'Unique', 'Split', 'Drop bytes', 'Drop every nth byte', 'Take bytes', 'Take every nth byte']],
    ['Search, Diff & Compare', ['Diff', 'Diff Summary', 'Duplicate Line Finder', 'Count occurrences', 'Filter', 'Fuzzy Match', 'Find / Replace', 'Regular expression', 'Regex Explainer', 'To Case Insensitive Regex', 'From Case Insensitive Regex']],
    ['Structured Query & Validation', ['CSS selector', 'JPath expression', 'XPath expression', 'JSON Query (jq-lite)', 'JSON Schema Validate', 'Generate JSON Schema', 'To Table']],
    ['Security & Data Hygiene', ['Secret Scanner', 'Check Digit Calculator', 'Caret/M-decode']],
    ['Unit Conversion', ['Convert area', 'Convert data units', 'Convert distance', 'Convert mass', 'Convert speed']],
    ['Statistics', ['Text Statistics']],
  ],
};
const SUBCAT_OF = {};
for (const [cat, groups] of Object.entries(SUBCATS)) for (const [label, names] of groups) for (const n of names) (SUBCAT_OF[cat] ??= {})[n] = label;
// Picked for everyday usefulness across IT/dev/security work, not strict parity with any particular tool.
const DEFAULT_FAV = [
  'Magic', 'To Base64', 'From Base64', 'To Hex', 'From Hex', 'To Hexdump', 'URL Encode', 'URL Decode',
  'ROT13', 'XOR', 'XOR Brute Force', 'JWT Decode', 'AES Encrypt', 'AES Decrypt', 'HMAC',
  'MD5', 'SHA2', 'Generate all hashes', 'Regular expression', 'Find / Replace', 'JSON Query (jq-lite)', 'Diff',
  'Gunzip', 'Gzip', 'Unzip', 'Zip',
  'Detect File Type', 'Strings', 'Extract IOCs', 'Extract URLs', 'Defang IP Addresses', 'Defang URL', 'Extract IP addresses', 'IP GeoLocation',
];
const VIEW_STEP = 256 * 1024;   // bytes shown in the text box at first; laying out multi-MB text freezes the page
const S = {
  mods: {}, cats: [], recipe: [], uid: 0, inputs: [{ name: 'Input 1', bytes: new Uint8Array(0), enc: 'utf8', out: null, big: false }], tab: 0, auto: true,
  fav: new Set(LS.get('fav', DEFAULT_FAV)), open: new Set(LS.get('openCats', ['favourites', 'data_format'])), openSub: new Set(LS.get('openSub', [])), seq: 0, stepTo: null, inspect: null,
  res: null, viewLimit: VIEW_STEP, out: new Uint8Array(0), hist: [], redoHist: [], connectionState: new Map(), cards: [], wrap: LS.get('wrap', true), blobUrl: null,
};
const cur = () => S.inputs[S.tab];
const hue = n => CAT_HUE[S.mods[n]?.category] ?? 200;

function defaultArgs(m) { return m.args.map(a => a.type === 'toggle' ? { string: a.value, option: a.option } : a.value); }
function newOp(name, args) {
  const m = S.mods[name]; const a = defaultArgs(m);
  (args || []).forEach((v, i) => { if (v !== undefined && v !== null && i < a.length) a[i] = v; });
  return { id: ++S.uid, module: name, args: a, disabled: false, breakpoint: false, collapsed: false, parallel: false };
}
const serialRecipe = () => S.recipe.map(o => ({ module: o.module, args: o.args, disabled: o.disabled, breakpoint: o.breakpoint, ...(o.parallel ? { parallel: true } : {}) }));

// ---------------------------------------------------------------- operations sidebar
let tipEl;
function showTip(e, name) {
  const m = S.mods[name]; hideTip();
  const guidance = FORENSICS_EVIDENCE_GUIDE[name];
  tipEl = el('div', { class: 'tip' }, el('b', {}, name), m.desc || '', guidance ? el('div', { class: 'dfir-help-inline' }, el('b', {}, 'Import: '), guidance.input, el('br'), el('b', {}, 'Typical source: '), guidance.source) : null, el('br'), el('small', {}, m.categoryLabel + (m.args.length ? ` · ${m.args.length} argument${m.args.length > 1 ? 's' : ''}` : '')));
  document.body.append(tipEl);
  const r = e.currentTarget.getBoundingClientRect();
  tipEl.style.left = Math.min(r.right + 10, innerWidth - 340) + 'px'; tipEl.style.top = Math.min(r.top, innerHeight - tipEl.offsetHeight - 10) + 'px';
}
function hideTip() { tipEl?.remove(); tipEl = null; }

function opRow(name, hl) {
  const m = S.mods[name];
  const star = el('span', {
    class: 'star' + (S.fav.has(name) ? ' on' : ''),
    title: 'Favourite',
    onclick: e => {
      e.stopPropagation();
      toggleFav(name);
    }
  }, icon('star'));

  let label = name;
  if (hl) {
    const i = name.toLowerCase().indexOf(hl);
    if (i >= 0) {
      label = [
        name.slice(0, i),
        el('mark', {}, name.slice(i, i + hl.length)),
        name.slice(i + hl.length)
      ];
    }
  }

  const groupingIcon = m.parallelSafe
    ? el(
        'span',
        {
          class: 'op-grouping',
          title: 'Supports parallel grouping',
          'aria-label': 'Supports parallel grouping'
        },
        icon('parallel')
      )
    : null;

  return el(
    'div',
    {
      class: 'op',
      draggable: 'true',
      ondblclick: () => addOp(name),
      onmouseenter: e => showTip(e, name),
      onmouseleave: hideTip,
      ondragstart: e => {
        hideTip();
        e.dataTransfer.setData('text/df-op', name);
        e.dataTransfer.effectAllowed = 'copy';
      }
    },

    el('span', {
      style: `width:6px;height:6px;border-radius:50%;background:hsl(${hue(name)} 90% 60%);flex:none`
    }),

    el('span', { class: 'nm' }, label),

    groupingIcon,

    hl
      ? el('span', { class: 'cat-tag' }, m.categoryLabel)
      : null,

    star,

    el(
      'span',
      {
        class: 'add',
        title: 'Add to recipe',
        onclick: e => {
          e.stopPropagation();
          addOp(name);
        }
      },
      icon('plus')
    )
  );
}
function toggleFav(n) { S.fav.has(n) ? S.fav.delete(n) : S.fav.add(n); LS.set('fav', [...S.fav]); renderOps(); }

function score(q, m) {
  const n = m.name.toLowerCase(); if (n === q) return 1000; if (n.startsWith(q)) return 500 - n.length; const i = n.indexOf(q); if (i >= 0) return 300 - i;
  if (m.aliases.some(a => a.toLowerCase().includes(q))) return 200;
  let qi = 0; for (const c of n) { if (c === q[qi]) qi++; } if (qi === q.length && q.length > 2) return 100;
  const toks = q.split(/\s+/); if (toks.length > 1 && toks.every(t => n.includes(t) || m.desc.toLowerCase().includes(t))) return 80;
  if (m.desc.toLowerCase().includes(q)) return 20; return 0;
}
function searchOps(q) { q = q.toLowerCase().trim(); return Object.values(S.mods).map(m => [score(q, m), m]).filter(x => x[0] > 0).sort((a, b) => b[0] - a[0] || a[1].name.localeCompare(b[1].name)).slice(0, 100).map(x => x[1].name); }

function renderCatChips(groups) {
  const chips = $('#catChips'); chips.replaceChildren();
  chips.append(...groups.map(c => el('span', { class: 'cat-chip' + (S.open.has(c.id) ? ' on' : ''), style: `--h:${CAT_HUE[c.id] ?? 200}`,
    onclick: () => {
      if (S.open.has(c.id)) { S.open.delete(c.id); LS.set('openCats', [...S.open]); renderOps(); return; }
      S.open.add(c.id); LS.set('openCats', [...S.open]); renderOps(); $(`[data-cat="${c.id}"]`)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    } },
    el('span', { class: 'hue' }), c.label, el('span', { class: 'n' }, c.modules.length))));
}
function catBody(c) {
  const subs = SUBCATS[c.id];
  if (!subs) return c.modules.map(n => opRow(n));
  const byLabel = SUBCAT_OF[c.id] || {};
  const used = new Set(); const groups = subs.map(([label, names]) => [label, names.filter(n => c.modules.includes(n))]).filter(([, ns]) => ns.length);
  groups.forEach(([, ns]) => ns.forEach(n => used.add(n)));
  const rest = c.modules.filter(n => !used.has(n));
  if (rest.length) groups.push(['Other', rest]);
  return groups.map(([label, names]) => {
    const key = c.id + '::' + label, open = !S.openSub.has('!' + key);   // open by default; '!' prefix marks an explicitly-collapsed group
    return el('div', { class: 'sub' + (open ? ' open' : '') },
      el('div', { class: 'sub-h', onclick: () => { const k = '!' + key; S.openSub.has(k) ? S.openSub.delete(k) : S.openSub.add(k); LS.set('openSub', [...S.openSub]); renderOps(); } },
        el('span', { class: 'ico chev' }, icon('chev')), label, el('span', { class: 'n' }, names.length)),
      el('div', { class: 'sub-body' }, open ? names.map(n => opRow(n)) : []));
  });
}
function renderOps() {
  const list = $('#opList'); const q = $('#opSearch').value; list.replaceChildren();
  const favs = [...S.fav].filter(n => S.mods[n]).sort((a, b) => a.localeCompare(b));
  const groups = [{ id: 'favourites', label: 'Favourites', modules: favs }, ...S.cats];
  renderCatChips(groups.filter(c => c.id !== 'favourites' || favs.length));
  if (q.trim()) {
    const r = searchOps(q);
    list.append(...(r.length ? r.map(n => el('div', { style: 'margin:0 8px' }, opRow(n, q.toLowerCase().trim()))) : [el('div', { class: 'empty' }, 'No operations match.')]));
    return;
  }
  for (const c of groups) {
    if (c.id === 'favourites' && !favs.length) continue;
    const open = S.open.has(c.id);
    const body = el('div', { class: 'cat-body' }, open ? catBody(c) : []);
    const box = el('div', { class: 'cat' + (open ? ' open' : ''), 'data-cat': c.id }, el('div', { class: 'cat-h', style: `--h:${CAT_HUE[c.id] ?? 200}`, onclick: () => { open ? S.open.delete(c.id) : S.open.add(c.id); LS.set('openCats', [...S.open]); renderOps(); } },
      el('span', { class: 'ico chev' }, icon('chev')), el('span', { class: 'hue' }), c.label, el('span', { class: 'n' }, c.modules.length)), body);
    list.append(box);
  }
}
function expandAllCats() {
  const favs = [...S.fav].filter(n => S.mods[n]);
  S.open = new Set(['favourites', ...S.cats.map(c => c.id)].filter(id => id !== 'favourites' || favs.length));
  S.openSub = new Set();   // clear explicit collapses so every subgroup opens too
  LS.set('openCats', [...S.open]); LS.set('openSub', [...S.openSub]); renderOps();
}
function collapseAllCats() { S.open = new Set(); LS.set('openCats', []); renderOps(); }

// ---------------------------------------------------------------- recipe
function updateHistoryButtons() {
  const undoBtn = $('#btnUndo'), redoBtn = $('#btnRedo');
  if (undoBtn) undoBtn.disabled = S.hist.length < 2;
  if (redoBtn) redoBtn.disabled = S.redoHist.length === 0;
}
function restoreHistoryRecipe(json) {
  const r = JSON.parse(json);
  S.recipe = r.map(o => Object.assign(newOp(o.module), {
    args: o.args, disabled: !!o.disabled, breakpoint: !!o.breakpoint, parallel: !!o.parallel,
  }));
  normalizeParallelLinks();
  S.stepTo = S.inspect = null;
  renderRecipe(); persist(); scheduleBake(true); updateHistoryButtons();
}
const hist = { push(clearRedo = true) {
  const j = JSON.stringify(serialRecipe());
  if (S.hist[S.hist.length - 1] !== j) {
    S.hist.push(j); if (S.hist.length > 60) S.hist.shift();
    if (clearRedo) S.redoHist.length = 0;
  }
  updateHistoryButtons();
} };
function undo() {
  if (S.hist.length < 2) return toast('Nothing to undo');
  S.redoHist.push(S.hist.pop());
  restoreHistoryRecipe(S.hist[S.hist.length - 1]);
}
function redo() {
  if (!S.redoHist.length) return toast('Nothing to redo');
  const next = S.redoHist.pop();
  S.hist.push(next);
  restoreHistoryRecipe(next);
}
function commit(structural = true) { normalizeParallelLinks(); hist.push(); persist(); if (structural) renderRecipe(); scheduleBake(); }
const commitArg = debounce(() => { hist.push(); }, 600);
function addOp(name, args, at) {
  const o = newOp(name, args); at == null ? S.recipe.push(o) : S.recipe.splice(at, 0, o);
  S.stepTo = null; S.inspect = null; if (innerWidth <= 1100) setPane('recipe'); commit(); const box = $('#recipeList'); setTimeout(() => { box.scrollTop = at == null ? box.scrollHeight : box.scrollTop; }, 30);
}
function selectOptions(options, selected) {
  return options.map(o => {
    if (typeof o === 'string') {
      return el('option', {
        value: o,
        selected: o === selected,
      }, o);
    }

    return el(
      'optgroup',
      { label: o.label },
      o.options.map(value =>
        el('option', {
          value,
          selected: value === selected,
        }, value)
      )
    );
  });
}


function parallelCompatible(left, right) {
  const a = left && S.mods[left.module], b = right && S.mods[right.module];
  if (!a?.parallelSafe || !b?.parallelSafe) return false;
  if (a.parallelGroup === b.parallelGroup) return !!a.parallelGroup;
  return ['ip-enrichment', 'ioc-enrichment'].includes(a.parallelGroup) &&
    ['ip-enrichment', 'ioc-enrichment'].includes(b.parallelGroup);
}
function canJoinPrevious(i) { return i > 0 && parallelCompatible(S.recipe[i - 1], S.recipe[i]); }
function normalizeParallelLinks() {
  for (let i = 0; i < S.recipe.length; i++) {
    if (S.recipe[i].parallel && !canJoinPrevious(i)) S.recipe[i].parallel = false;
  }
}
function toggleParallel(i) {
  const op = S.recipe[i]; if (!op || !S.mods[op.module]?.parallelSafe) return;
  if (!op.parallel && !canJoinPrevious(i)) return;
  op.parallel = !op.parallel;
  S.stepTo = S.inspect = null;
  commit();
}
function inParallelGroup(i) { return !!S.recipe[i]?.parallel || !!S.recipe[i + 1]?.parallel; }
function parallelClass(i) {
  if (!inParallelGroup(i)) return '';
  const first = !S.recipe[i]?.parallel && !!S.recipe[i + 1]?.parallel;
  const last = !!S.recipe[i]?.parallel && !S.recipe[i + 1]?.parallel;
  return ' parallel-member' + (first ? ' parallel-first' : '') + (last ? ' parallel-last' : '');
}

function maskCredential(value) {
  const text = String(value || '');
  if (!text) return '';
  if (text.length <= 8) return '••••••••';
  return text.slice(0, 4) + '••••' + text.slice(-4);
}
function connectionControl(mod) {
  const cfg = mod?.connection;
  if (!cfg?.id || typeof cfg.test !== 'function') return null;
  let saved = getServiceCredential(cfg.id);
  let remembered = S.connectionState.get(cfg.id);
  if (!remembered) {
    remembered = cfg.required && !saved
      ? { kind: 'bad', text: `${cfg.label || 'Credential'} required` }
      : { kind: 'muted', text: saved ? 'Saved in this tab · Test to verify' : 'Not tested' };
    S.connectionState.set(cfg.id, remembered);
  }
  const box = el('div', { class: 'connection-box' });
  const status = el('div', { class: 'connection-state', role: 'status' });
  const input = cfg.type === 'none' ? null : el('input', {
    type: 'password', autocomplete: 'new-password', spellcheck: 'false',
    placeholder: saved ? `${maskCredential(saved)} (saved in this tab)` : (cfg.placeholder || cfg.label || 'Credential'),
  });
  const apply = (kind, text) => {
    const state = { kind, text }; S.connectionState.set(cfg.id, state);
    box.className = 'connection-box conn-' + kind;
    status.className = 'connection-state ' + kind;
    status.textContent = text;
  };
  const state = remembered; apply(state.kind, state.text);
  let testing = false;
  const test = async () => {
    if (testing) return;
    const existing = getServiceCredential(cfg.id);
    const entered = input?.value.trim() || '';
    const value = entered || existing;
    if (cfg.required && !value) { apply('bad', `${cfg.label || 'Credential'} required`); input?.focus(); return; }
    testing = true; testBtn.disabled = true; clearBtn && (clearBtn.disabled = true); apply('checking', 'Testing connection…');
    try {
      const result = await cfg.test(value);
      if (!result?.ok) throw new Error(result?.message || 'Connection test failed');
      if (input && entered) {
        setServiceCredential(cfg.id, entered);
        saved = entered;
        input.value = '';
        input.placeholder = `${maskCredential(entered)} (saved in this tab)`;
      }
      apply('ok', result.message || 'Connected');
    } catch (error) {
      apply('bad', error?.message || String(error));
    } finally {
      testing = false; testBtn.disabled = false; if (clearBtn) clearBtn.disabled = false;
    }
  };
  const testBtn = el('button', { type: 'button', class: 'btn connection-test', onclick: test }, cfg.type === 'none' ? 'Test connection' : 'Connect & Test');
  const clearBtn = input ? el('button', { type: 'button', class: 'btn ghost', onclick: () => {
    clearServiceCredential(cfg.id); saved = ''; input.value = ''; input.placeholder = cfg.placeholder || cfg.label || 'Credential';
    apply(cfg.required ? 'bad' : 'muted', cfg.required ? `${cfg.label || 'Credential'} required` : 'Cleared');
  } }, 'Clear') : null;
  if (input) {
    input.addEventListener('input', () => apply('bad', input.value.trim() ? 'Not verified · Connect & Test' : (saved ? 'Saved value unchanged · Test to verify' : `${cfg.label || 'Credential'} required`)));
    input.addEventListener('change', () => { if (input.value.trim()) test(); });
  }
  box.append(
    el('div', { class: 'connection-title' }, cfg.label || 'Connection'),
    input ? el('div', { class: 'connection-row' }, input, testBtn, clearBtn) : el('div', { class: 'connection-row' }, testBtn),
    status,
    cfg.help ? el('div', { class: 'connection-help' }, cfg.help) : null,
  );
  return box;
}

function argField(op, spec, i) {
  const set = v => { op.args[i] = v; S.stepTo = null; persist(); commitArg(); scheduleBake(); };
  const v = op.args[i];
  const tip = spec.hint || '';
  switch (spec.type) {
    case 'files': {
      const status = el('div', { class: 'file-arg-status' });
      const pick = el('input', { type: 'file', accept: spec.accept || '', multiple: spec.multiple !== false, hidden: true });
      const btn = el('button', { type: 'button', class: 'btn', onclick: () => pick.click() }, icon('open'), 'Choose files');
      const paint = () => {
        const sum = summarizeGeoIpBundle(op.args[i]);
        status.replaceChildren();
        if (!sum) { status.append(el('span', { class: 'muted' }, v ? 'Files are not in this browser session — select them again.' : 'No MMDB selected. An authorized public GeoLite2 City feed will be used if available.')); return; }
        status.append(el('b', {}, sum.count + ' database' + (sum.count === 1 ? '' : 's') + ' · ' + fmtBytes(sum.bytes)));
        for (const d of sum.databases) status.append(el('div', { class: 'file-db', title: d.databaseType }, el('span', {}, d.name), el('small', {}, d.provider + ' · ' + d.role + ' · ' + fmtBytes(d.size) + (d.buildEpoch ? ' · Updated: ' + new Date(d.buildEpoch * 1000).toISOString().slice(0, 10) : '') + ' · ' + d.databaseType)));
        if (sum.databases.some(d => d.provider === 'DB-IP')) status.append(el('a', { class: 'dbip-credit', href: 'https://db-ip.com', target: '_blank', rel: 'noopener noreferrer' }, 'IP Geolocation by DB-IP'));
      };
      pick.addEventListener('change', async e => {
        const files = [...e.target.files]; if (!files.length) return;
        btn.disabled = true; btn.replaceChildren(el('span', { class: 'spin' }), 'Loading…');
        try {
          const entries = [];
          for (const f of files) entries.push({ name: f.name, bytes: new Uint8Array(await f.arrayBuffer()) });
          const id = loadGeoIpBundle(entries);
          const previous = op.args[i];
          set(id);
          if (previous) dropGeoIpBundle(previous);
          paint();
          toast('Loaded ' + files.length + ' MMDB database' + (files.length === 1 ? '' : 's'));
        } catch (err) { toast('Could not load MMDB: ' + err.message, true); }
        finally { btn.disabled = false; btn.replaceChildren(icon('open'), 'Choose files'); pick.value = ''; }
      });
      const box = el('div', { class: 'arg file-arg', title: tip }, el('label', {}, spec.name), el('div', { class: 'row' }, btn, pick), status);
      paint(); return box;
    }
    case 'boolean':
      return el('div', { class: 'arg bool' }, el('label', {}, spec.name), el('label', { class: 'switch' }, el('input', { type: 'checkbox', checked: !!v, onchange: e => set(e.target.checked) }), el('i')));
    case 'select':
		return el(
			'div',
			{ class: 'arg' },
			el('label', {}, spec.name),
			el(
			'select',
			{ onchange: e => set(e.target.value) },
			selectOptions(spec.options, v)
			)
		);
    case 'number':
      return el('div', { class: 'arg' }, el('label', {}, spec.name), el('input', { type: 'number', value: v, min: spec.min ?? false, max: spec.max ?? false, step: spec.step || 1, oninput: e => set(e.target.value === '' ? spec.value : Number(e.target.value)) }));
    case 'area':
      return el('div', { class: 'arg' }, el('label', {}, spec.name), el('textarea', { spellcheck: 'false', oninput: e => set(e.target.value) }, v));
    case 'combo': {
      const inp = el('input', { type: 'text', value: v, spellcheck: 'false', oninput: e => { sel.value = ''; set(e.target.value); } });
      const sel = el('select', { onchange: e => { if (e.target.value === '') return; inp.value = spec.presets[+e.target.value][1]; set(inp.value); } },
        el('option', { value: '' }, 'presets…'), spec.presets.map((p, j) => el('option', { value: j }, p[0])));
      return el('div', { class: 'arg' }, el('label', {}, spec.name), el('div', { class: 'row' }, inp, sel));
    }
    case 'toggle': {
      const inp = el('input', { type: 'text', value: v.string, spellcheck: 'false', oninput: e => set({ string: e.target.value, option: v.option }) });
      const sel = el('select', { onchange: e => { v.option = e.target.value; set({ string: inp.value, option: e.target.value }); } }, spec.options.map(o => el('option', { value: o, selected: o === v.option }, o)));
      return el('div', { class: 'arg' }, el('label', {}, spec.name), el('div', { class: 'row' }, inp, sel));
    }
    default:
      return el('div', { class: 'arg', title: tip }, el('label', {}, spec.name), el('input', { type: 'text', value: v, spellcheck: 'false', placeholder: tip, oninput: e => set(e.target.value) }));
  }
}

function renderRecipe() {
  const box = $('#recipeList'); box.replaceChildren(); S.cards = [];
  if (!S.recipe.length) {
    box.append(el('div', { class: 'drop-hint' }, el('div', {}, 'Your recipe is empty'), el('div', {}, 'Double-click or ', el('b', {}, 'drag'), ' an operation here,'), el('div', {}, 'or press ', el('kbd', {}, 'Ctrl K'), ' to search.')));
    return;
  }
  let depth = 0;
  S.recipe.forEach((op, i) => {
    const m = S.mods[op.module]; if (!m) return;
    if (op.module === 'Merge') depth = Math.max(0, depth - 1);
    const info = el('div', { class: 'step-info' });
    const card = el('div', { class: 'step' + (op.disabled ? ' disabled' : '') + (m.flow ? ' flow' : '') + (op.collapsed ? ' collapsed' : '') + parallelClass(i), style: `--h:${hue(op.module)};margin-left:${depth * 14}px`, dataset: { i } },
      el('div', { class: 'step-h', draggable: 'true',
        ondragstart: e => {
          e.dataTransfer.setData('text/df-step', String(i));
          e.dataTransfer.effectAllowed = 'move';
          box._dragFrom = i;
          box._dragSource = card;
          card.classList.add('recipe-dragging');
          card._dragCssText = card.style.cssText;
          // Let the browser capture the normal card as the drag image first. On the
          // next frame collapse its old slot; the placeholder below then makes the
          // surrounding cards visibly move into their prospective positions.
          requestAnimationFrame(() => {
            card.classList.add('recipe-drag-source');
            card.style.height = '0px';
            card.style.minHeight = '0px';
            card.style.marginTop = '-8px';
            card.style.marginBottom = '0';
            card.style.paddingTop = '0';
            card.style.paddingBottom = '0';
            card.style.borderWidth = '0';
            card.style.opacity = '0';
            card.style.overflow = 'hidden';
            card.style.pointerEvents = 'none';
          });
        },
        ondragend: () => clearRecipeDragPreview(box, card),
      },
        el('span', { class: 'grip' }, icon('grip')), el('span', { class: 'idx' }, String(i + 1).padStart(2, '0')),
        el('span', { class: 'title', title: m.desc, onclick: () => { op.collapsed = !op.collapsed; card.classList.toggle('collapsed'); persist(); } }, op.module),
        m.parallelSafe ? el('button', {
          class: 'icon-btn parallel-btn' + (op.parallel ? ' on' : ''),
          title: op.parallel ? 'Stop grouping this operation with the one above' : canJoinPrevious(i) ? 'Run in parallel with the compatible operation above' : 'Parallel-safe, but the operation above is not compatible',
          disabled: !op.parallel && !canJoinPrevious(i), onclick: () => toggleParallel(i),
        }, icon('parallel')) : null,
        el('button', { class: 'icon-btn', title: 'Show the output of this step', onclick: () => inspect(i) }, icon('eye')),
        el('button', { class: 'icon-btn' + (op.breakpoint ? ' on' : ''), title: 'Breakpoint: pause before this step', onclick: e => { op.breakpoint = !op.breakpoint; e.currentTarget.classList.toggle('on'); S.stepTo = null; commit(false); } }, icon('flag')),
        el('button', { class: 'icon-btn' + (op.disabled ? ' on' : ''), title: 'Disable / enable', onclick: () => { op.disabled = !op.disabled; commit(); } }, icon('power')),
        el('button', { class: 'icon-btn', title: 'Move up', onclick: () => move(i, i - 1) }, icon('up')),
        el('button', { class: 'icon-btn', title: 'Move down', onclick: () => move(i, i + 2) }, icon('down')),
        el('button', { class: 'icon-btn', title: 'Remove', onclick: () => { S.recipe.splice(i, 1); S.stepTo = null; commit(); } }, icon('x'))),
      el('div', { class: 'step-b' }, m.desc ? el('div', { class: 'desc' }, m.desc) : null, (FORENSICS_EVIDENCE_GUIDE[op.module] ? el('div', { class: 'dfir-evidence' }, el('div', {}, el('b', {}, 'Input: '), FORENSICS_EVIDENCE_GUIDE[op.module].input), el('div', {}, el('b', {}, 'Typical location: '), FORENSICS_EVIDENCE_GUIDE[op.module].source), el('div', {}, el('b', {}, 'Acquisition: '), FORENSICS_EVIDENCE_GUIDE[op.module].acquire), FORENSICS_EVIDENCE_GUIDE[op.module].note ? el('div', {}, el('b', {}, 'Limitation: '), FORENSICS_EVIDENCE_GUIDE[op.module].note) : null) : null), connectionControl(m), m.args.map((a, j) => argField(op, a, j)), info));
    card._info = info; S.cards[i] = card; box.append(card);
    if (op.module === 'Fork' || op.module === 'Subsection') depth++;
  });
  if (S.res) paintSteps();
}
function move(from, to) {
  if (to < 0 || to > S.recipe.length) return; const [o] = S.recipe.splice(from, 1); S.recipe.splice(to > from ? to - 1 : to, 0, o); S.stepTo = null; commit();
}
function clearRecipeDragPreview(box = $('#recipeList'), source = box?._dragSource) {
  box?.querySelector('.recipe-drop-slot')?.remove();
  $$('.step', box || document).forEach(c => c.classList.remove('dragover'));
  if (source) {
    source.classList.remove('recipe-dragging', 'recipe-drag-source');
    if (source._dragCssText != null) source.style.cssText = source._dragCssText;
    delete source._dragCssText;
  }
  if (box) { box._dragFrom = null; box._dragSource = null; box._dropAt = null; }
}
function wireRecipeDnD() {
  const box = $('#recipeList');
  const idxAt = y => {
    const cs = $$('.step', box).filter(c => c !== box._dragSource);
    let i = 0;
    for (const c of cs) { const r = c.getBoundingClientRect(); if (y > r.top + r.height / 2) i++; }
    return i;
  };
  const animateReflow = (cards, before) => {
    for (const c of cards) {
      const oldTop = before.get(c); if (oldTop == null) continue;
      const delta = oldTop - c.getBoundingClientRect().top;
      if (Math.abs(delta) < 1) continue;
      try { c.animate([{ transform: `translateY(${delta}px)` }, { transform: 'translateY(0)' }], { duration: 150, easing: 'ease-out' }); }
      catch { /* Web Animations is cosmetic only */ }
    }
  };
  const previewInternal = y => {
    const from = Number(box._dragFrom);
    if (!Number.isInteger(from) || from < 0) return null;
    const source = box._dragSource;
    const cards = $$('.step', box).filter(c => c !== source);
    let reducedAt = cards.length;
    for (let j = 0; j < cards.length; j++) {
      const r = cards[j].getBoundingClientRect();
      if (y < r.top + r.height / 2) { reducedAt = j; break; }
    }
    const originalAt = reducedAt > from ? reducedAt + 1 : reducedAt;
    if (box._dropAt === originalAt && box.querySelector('.recipe-drop-slot')) return originalAt;

    const before = new Map(cards.map(c => [c, c.getBoundingClientRect().top]));
    let slot = box.querySelector('.recipe-drop-slot');
    if (!slot) {
      slot = el('div', {
        class: 'recipe-drop-slot', 'aria-hidden': 'true',
        style: 'display:grid;place-items:center;border:2px dashed var(--accent);border-radius:10px;background:rgba(var(--accent-rgb),.08);color:var(--accent);font:700 11px var(--mono);letter-spacing:.06em;box-shadow:inset 0 0 18px rgba(var(--accent-rgb),.06)'
      }, el('span', {}, 'Drop here'));
      const h = source?.getBoundingClientRect().height || 52;
      slot.style.minHeight = `${Math.max(44, Math.min(120, h))}px`;
    }
    if (reducedAt < cards.length) box.insertBefore(slot, cards[reducedAt]); else box.append(slot);
    box._dropAt = originalAt;
    requestAnimationFrame(() => animateReflow(cards, before));
    return originalAt;
  };

  box.addEventListener('dragover', e => {
    if (![...e.dataTransfer.types].some(t => t.startsWith('text/df-'))) return;
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    const internal = [...e.dataTransfer.types].includes('text/df-step') && Number.isInteger(Number(box._dragFrom));
    if (internal) {
      previewInternal(e.clientY);
      const r = box.getBoundingClientRect();
      if (e.clientY < r.top + 44) box.scrollTop -= 14;
      else if (e.clientY > r.bottom - 44) box.scrollTop += 14;
      return;
    }
    const cs = $$('.step', box); cs.forEach(c => c.classList.remove('dragover'));
    const i = idxAt(e.clientY); cs[i]?.classList.add('dragover');
  });
  box.addEventListener('dragleave', e => {
    if (!box.contains(e.relatedTarget) && box._dragFrom == null) $$('.step', box).forEach(c => c.classList.remove('dragover'));
  });
  box.addEventListener('drop', e => {
    e.preventDefault();
    const name = e.dataTransfer.getData('text/df-op'), step = e.dataTransfer.getData('text/df-step');
    if (name) {
      const at = idxAt(e.clientY); clearRecipeDragPreview(box); addOp(name, null, at); return;
    }
    if (step !== '') {
      const from = +step, at = Number.isInteger(box._dropAt) ? box._dropAt : idxAt(e.clientY);
      clearRecipeDragPreview(box); move(from, at);
    } else clearRecipeDragPreview(box);
  });
}
// dragging a recipe step onto the operations panel removes it ("drag to delete")
function wireOpsPaneDnD() {
  const pane = $('#opsPane');
  pane.addEventListener('dragover', e => { if ([...e.dataTransfer.types].includes('text/df-step')) { e.preventDefault(); e.dataTransfer.dropEffect = 'move'; pane.classList.add('drop-remove'); } });
  pane.addEventListener('dragleave', e => { if (!pane.contains(e.relatedTarget)) pane.classList.remove('drop-remove'); });
  pane.addEventListener('drop', e => {
    const step = e.dataTransfer.getData('text/df-step');
    pane.classList.remove('drop-remove');
    if (step === '') return;
    e.preventDefault();
    const i = +step, removed = S.recipe[i];
    S.recipe.splice(i, 1); S.stepTo = null; commit();
    if (removed) toast(`Removed ${removed.module}`);
  });
}

// ---------------------------------------------------------------- baking
let bakeTimer, activeBake = null, stepParallelCache = new Map();
function setStatus(kind, text) { $('#statusDot').className = 'dot' + (kind ? ' ' + kind : ''); $('#statusText').textContent = text; }
function combinedAbortSignal(a, b) {
  if (!a) return b; if (!b) return a;
  if (typeof AbortSignal !== 'undefined' && typeof AbortSignal.any === 'function') return AbortSignal.any([a, b]);
  const c = new AbortController();
  const relay = signal => {
    const stop = () => { if (!c.signal.aborted) c.abort(signal.reason); };
    if (signal.aborted) stop(); else signal.addEventListener('abort', stop, { once: true });
  };
  relay(a); relay(b); return c.signal;
}
function setCancelEnabled(enabled) {
  const button = $('#btnCancelBake');
  if (!button) return;
  button.disabled = !enabled;
  button.style.opacity = enabled ? '1' : '.42';
  button.style.cursor = enabled ? 'pointer' : 'not-allowed';
}
function cancelBake(silent = false) {
  const run = activeBake;
  if (!run) return false;
  run.cancelled = true;
  if (globalThis.fetch === run.fetchWrapper) globalThis.fetch = run.originalFetch;
  try { run.controller.abort(new DOMException('Recipe run cancelled', 'AbortError')); }
  catch { run.controller.abort(); }
  if (activeBake === run) activeBake = null;
  S.seq++; // invalidate any late result from work that cannot be interrupted synchronously
  $('#btnBake')?.classList.remove('busy');
  $('#progress').hidden = true;
  setCancelEnabled(false);
  if (!silent) { showBanner('', ''); setStatus('', 'Cancelled'); }
  return true;
}
const hasNet = () => S.recipe.some(o => !o.disabled && S.mods[o.module]?.net);
function scheduleBake(now) { S.outputDirty = true; if (!S.auto && !now) return; if (hasNet() && now !== 'manual') { setStatus('', 'Network operation in the recipe: press SPIN to run it'); return; } clearTimeout(bakeTimer); bakeTimer = setTimeout(bake, now ? 0 : 220); }

async function bake(opts = {}) {
  if (activeBake) cancelBake(true);
  clearTimeout(bakeTimer); const seq = ++S.seq;
  const upto = opts.upto ?? S.stepTo ?? S.inspect; const inp = cur();
  const controller = new AbortController();
  const originalFetch = globalThis.fetch;
  const run = { seq, controller, originalFetch, fetchWrapper: null, cancelled: false };
  run.fetchWrapper = (resource, init = {}) => originalFetch(resource, { ...init, signal: combinedAbortSignal(init?.signal, controller.signal) });
  globalThis.fetch = run.fetchWrapper;
  activeBake = run;

  setStatus('busy', 'Spinning…'); $('#btnBake').classList.add('busy'); $('#progress').hidden = false; $('#progress').classList.remove('det');
  setCancelEnabled(true);
  try {
    const j = await engineBake(inp.bytes, serialRecipe(), upto ?? null, { signal: controller.signal, parallelCache: opts.parallelCache || null });
    if (run.cancelled || controller.signal.aborted || seq !== S.seq) return;
    S.res = j; S.out = j.output; S.outputTab = S.tab; S.outputDirty = false; S.viewLimit = VIEW_STEP; inp.out = { bytes: S.out, html: j.html };
    paintSteps(); renderOutput(); if (!$('#findbar').hidden) findRun();
    persist(); // Preserve the displayed result, including binary output, across refreshes.
    $('#outTime').textContent = `${j.ms} ms`;
    setStatus(j.error ? 'err' : '', j.error ? `Error in step ${j.error.step + 1}` : j.pausedAt != null ? `Paused before step ${j.pausedAt + 1}` : 'Ready');
    $('#statusRight').textContent = `IN ${fmtBytes(inp.bytes.length)} → OUT ${fmtBytes(S.out.length)} · ${j.ms} ms`;
  } catch (e) {
    if (run.cancelled || controller.signal.aborted) {
      if (seq === S.seq) { showBanner('', ''); setStatus('', 'Cancelled'); }
    } else { setStatus('err', 'Error'); showBanner('err', e.message); }
  } finally {
    if (globalThis.fetch === run.fetchWrapper) globalThis.fetch = originalFetch;
    if (activeBake === run) activeBake = null;
    if (seq === S.seq) {
      $('#btnBake').classList.remove('busy'); $('#progress').hidden = true;
      setCancelEnabled(false);
    }
  }
}
function paintSteps() {
  const res = S.res; if (!res) return;
  S.cards.forEach((card, i) => {
    if (!card) return; const st = res.steps[i]; const info = card._info; info.replaceChildren(); card.classList.remove('err', 'paused');
    if (!st) return;
    if (st.skipped) { info.append('skipped'); return; }
    if (st.error) {
      card.classList.add('err');
      if (st.cached) info.append(el('span', { class: 'chip', title: 'This provider result was already attempted in the current Step sequence' }, '⚡ cached'));
      info.append(el('span', { class: 'errmsg' }, st.error)); return;
    }
    if (st.cached) { info.append(el('span', { class: 'chip', title: 'Already completed in the current Step sequence; not run again' }, '⚡ cached')); return; }
    if (st.inblock) { info.append('inside Fork/Subsection'); return; }
    if (st.regs) { Object.entries(st.regs).forEach(([k, v]) => info.append(el('div', { class: 'step-prev', style: 'width:100%' }, k ? `${k} = ${v}` : v))); }
    if (st.size != null) {
      const prev = el('div', { class: 'step-prev', hidden: true }, st.preview || '(empty)');
      info.append(el('span', {}, `${st.ms} ms`), el('span', {}, fmtBytes(st.size)), st.preview != null ? el('span', { class: 'chip', onclick: () => { prev.hidden = !prev.hidden; } }, 'preview') : null, prev);
    }
  });
  if (res.pausedAt != null) S.cards[res.pausedAt]?.classList.add('paused');
}
function showBanner(kind, msg, btn) {
  const b = $('#banner'); if (!msg) { b.hidden = true; return; } b.hidden = false; b.className = 'banner ' + kind; b.replaceChildren(msg, btn || '');
}
function inspect(i) { S.inspect = i; S.stepTo = null; bake({ upto: i }); }
function step() {
  const n = S.recipe.length; if (!n) return;
  // A new Step sequence gets a fresh parallel branch cache. While advancing through
  // one configured parallel stage, completed providers are reused instead of being
  // called again. The next click therefore runs only the newly reached provider.
  if (S.stepTo == null) stepParallelCache = new Map();
  if (S.res?.pausedAt != null && S.stepTo == null) S.stepTo = S.res.pausedAt;
  else S.stepTo = S.stepTo == null ? 0 : Math.min(S.stepTo + 1, n - 1);
  S.inspect = null;
  bake({ upto: S.stepTo, parallelCache: stepParallelCache });
}


// ---------------------------------------------------------------- archive file browser
function sniffArchive(u) {
  if (u.length >= 4 && u[0] === 0x50 && u[1] === 0x4b && (u[2] === 3 || u[2] === 5 || u[2] === 7)) return 'zip';
  if (u.length > 262 && u[257] === 0x75 && u[258] === 0x73 && u[259] === 0x74 && u[260] === 0x61 && u[261] === 0x72) return 'tar';
  if (u.length >= 6 && u[0] === 0x37 && u[1] === 0x7a && u[2] === 0xbc && u[3] === 0xaf && u[4] === 0x27 && u[5] === 0x1c) return '7z';
  if (u.length >= 7 && u[0] === 0x52 && u[1] === 0x61 && u[2] === 0x72 && u[3] === 0x21 && u[4] === 0x1a && u[5] === 0x07) return 'rar';
  return null;
}
const dv = u => new DataView(u.buffer, u.byteOffset, u.byteLength);

function parseZipEntries(u) {
  if (u.length < 22) throw new Error(`Only ${u.length} byte(s) - too small to be a ZIP file`);
  const d = dv(u);
  let eocd = -1;
  for (let i = u.length - 22; i >= Math.max(0, u.length - 22 - 65535); i--) { if (d.getUint32(i, true) === 0x06054b50) { eocd = i; break; } }
  if (eocd < 0) throw new Error(`End of central directory record not found in ${fmtBytes(u.length)} of data (truncated, password-protected headers, or not actually a ZIP file)`);
  let count = d.getUint16(eocd + 10, true), cdOff = d.getUint32(eocd + 16, true);
  if (count === 0xffff || cdOff === 0xffffffff) {
    // ZIP64: the real values live in the ZIP64 EOCD record, pointed to by a locator just before this record
    const locOff = eocd - 20;
    if (locOff < 0 || d.getUint32(locOff, true) !== 0x07064b50) throw new Error('This looks like a ZIP64 archive (>65535 entries or >4GB) with a locator this parser could not find');
    const z64eocd = Number(d.getBigUint64(locOff + 8, true));
    if (d.getUint32(z64eocd, true) !== 0x06064b50) throw new Error('ZIP64 end-of-central-directory record not found at the expected offset');
    count = Number(d.getBigUint64(z64eocd + 32, true));
    cdOff = Number(d.getBigUint64(z64eocd + 48, true));
  }
  const entries = []; let p = cdOff;
  for (let i = 0; i < count; i++) {
    if (p + 46 > u.length || d.getUint32(p, true) !== 0x02014b50) throw new Error(`Central directory is corrupt or truncated (entry ${i + 1} of ${count} not found at the expected offset)`);
    const method = d.getUint16(p + 10, true), crc = d.getUint32(p + 16, true), csize = d.getUint32(p + 20, true), usize = d.getUint32(p + 24, true);
    const nlen = d.getUint16(p + 28, true), elen = d.getUint16(p + 30, true), clen = d.getUint16(p + 32, true), lho = d.getUint32(p + 42, true);
    const gpflag = d.getUint16(p + 8, true);
    const utf8Flag = gpflag & 0x0800;
    const nameBytes = u.subarray(p + 46, p + 46 + nlen);
    const name = utf8Flag ? new TextDecoder('utf-8').decode(nameBytes) : Array.from(nameBytes, b => String.fromCharCode(b)).join('');
    entries.push({ name, method, crc, csize, usize, localOffset: lho, dir: name.endsWith('/'), encrypted: !!(gpflag & 0x0001) || method === 99 });
    p += 46 + nlen + elen + clen;
  }
  return entries;
}
async function zipEntryBytes(u, entry) {
  if (entry.encrypted) throw new Error("This entry is password-protected - add the 'Unzip' operation to the recipe with the password to extract it");
  const d = dv(u);
  const p = entry.localOffset;
  if (d.getUint32(p, true) !== 0x04034b50) throw new Error('Corrupt local file header');
  const nlen = d.getUint16(p + 26, true), elen = d.getUint16(p + 28, true);
  const dataStart = p + 30 + nlen + elen;
  const raw = u.subarray(dataStart, dataStart + entry.csize);
  if (entry.method === 0) return raw;
  if (entry.method === 8) {
    const ds = new DecompressionStream('deflate-raw');
    const stream = new Blob([raw]).stream().pipeThrough(ds);
    return new Uint8Array(await new Response(stream).arrayBuffer());
  }
  throw new Error(`Unsupported ZIP compression method ${entry.method} (only Store and Deflate can be previewed in the browser - try the Unzip operation instead)`);
}
function parseTarEntries(u) {
  const entries = []; let p = 0;
  const oct = (o, l) => { const s = new TextDecoder().decode(u.subarray(o, o + l)).replace(/\0.*/s, '').trim(); return s ? parseInt(s, 8) : 0; };
  while (p + 512 <= u.length) {
    if (u.subarray(p, p + 8).every(b => b === 0)) break;
    const name = new TextDecoder().decode(u.subarray(p, p + 100)).replace(/\0.*/s, '');
    if (!name) break;
    const size = oct(p + 124, 12), typeflag = String.fromCharCode(u[p + 156] || 0);
    entries.push({ name, size, dataOffset: p + 512, dir: typeflag === '5' || name.endsWith('/') });
    p += 512 + Math.ceil(size / 512) * 512;
  }
  return entries;
}
function tarEntryBytes(u, entry) { return u.subarray(entry.dataOffset, entry.dataOffset + entry.size); }

async function renderFileBrowser(body, u, kind) {
  const wrap = el('div', { class: 'filebrowser' });
  if (!kind) {
    wrap.append(el('div', { class: 'fb-note' },
      `This doesn't start with a recognised archive signature (ZIP, TAR, 7-Zip or RAR). `,
      `If the last recipe step extracted a single file (e.g. Unzip with the right password), this is its actual content - `,
      el('button', { class: 'btn', style: 'margin:8px 0 0', onclick: () => { $('#outView').value = 'auto'; $('#outView').dispatchEvent(new Event('change')); } }, 'Switch to Auto view'),
      el('div', { style: 'margin-top:10px;color:var(--dim)' }, `Otherwise, check the banner above for an error from that step.`)));
    body.append(wrap);
    return;
  }
  if (kind === '7z' || kind === 'rar') {
    wrap.append(el('div', { class: 'fb-note' },
      `Detected a ${kind === '7z' ? '7-Zip' : 'RAR'} archive. These formats can't be unpacked in the browser - add the `,
      el('b', {}, kind === '7z' ? '7-Zip Extract' : 'RAR Extract'), ' operation to the recipe to list or extract files from it.'));
    body.append(wrap);
    return;
  }
  let entries;
  try { entries = kind === 'zip' ? parseZipEntries(u) : parseTarEntries(u); }
  catch (e) { wrap.append(el('div', { class: 'fb-note' }, 'Could not read this archive: ' + e.message)); body.append(wrap); return; }
  const getBytes = e => kind === 'zip' ? zipEntryBytes(u, e) : Promise.resolve(tarEntryBytes(u, e));
  const files = entries.filter(e => !e.dir);
  const totalRaw = files.reduce((n, e) => n + (e.usize ?? e.size), 0);
  const head = el('div', { class: 'fb-head' }, el('b', {}, kind.toUpperCase()), `${files.length} file${files.length === 1 ? '' : 's'}`, `·`, fmtBytes(totalRaw) + ' uncompressed');
  const list = el('div', { class: 'fb-list' });
  const previewBox = el('div', { class: 'fb-preview', hidden: true });
  const table = el('table', { class: 'fb-table' },
    el('thead', {}, el('tr', {}, el('th', {}, 'Name'), el('th', {}, 'Size'), kind === 'zip' ? el('th', {}, 'Ratio') : null, el('th', {}, ''))),
    el('tbody', {}, files.map(e => {
      const usize = e.usize ?? e.size;
      const ratio = kind === 'zip' && usize ? `${Math.round(100 - e.csize / usize * 100)}%` : '';
      const row = el('tr', { class: 'row', onclick: () => preview(e) },
        el('td', {}, el('div', { class: 'nm', title: e.encrypted ? e.name + ' (password-protected)' : e.name }, icon(e.encrypted ? 'lock' : 'file'), el('span', { class: 't' }, e.name))),
        el('td', { class: 'sz' }, fmtBytes(usize)),
        kind === 'zip' ? el('td', { class: 'ratio' }, ratio) : null,
        el('td', { class: 'act' },
          el('button', { class: 'icon-btn', title: 'Download this file', onclick: ev => { ev.stopPropagation(); downloadEntry(e); } }, icon('download')),
          el('button', { class: 'icon-btn', title: 'Use as input', onclick: ev => { ev.stopPropagation(); useAsInput(e); } }, icon('swap'))));
      return row;
    })));
  list.append(table);
  async function downloadEntry(e) { try { download(e.name.split('/').pop(), await getBytes(e)); } catch (err) { toast('Could not extract: ' + err.message, true); } }
  async function useAsInput(e) { try { setInputBytes(await getBytes(e), e.name.split('/').pop()); if (narrow()) setPane('io'); } catch (err) { toast('Could not extract: ' + err.message, true); } }
  async function preview(e) {
    previewBox.hidden = false; previewBox.replaceChildren(el('div', { class: 'fb-ph' }, 'Loading…'));
    let bytes; try { bytes = await getBytes(e); } catch (err) {
      previewBox.replaceChildren(el('div', { class: 'fb-ph' }, err.message), el('div', { class: 'fb-note' },
        'Add ', el('b', {}, 'Unzip'), ' to the recipe with the password in its Password argument, and set its Extract file field to ', el('b', {}, e.name), '.'));
      return;
    }
    const img = sniffImage(bytes);
    const ph = el('div', { class: 'fb-ph' }, el('b', {}, e.name), `${fmtBytes(bytes.length)}`,
      el('button', { class: 'btn', style: 'margin-left:auto', onclick: () => download(e.name.split('/').pop(), bytes) }, 'Download'),
      el('button', { class: 'btn', onclick: () => { setInputBytes(bytes, e.name.split('/').pop()); if (narrow()) setPane('io'); } }, 'Use as input'),
      el('button', { class: 'icon-btn', title: 'Expand preview', onclick: () => { const on = previewBox.classList.toggle('maxed'); list.classList.toggle('mined', on); } }, icon('eye')));
    if (img) {
      const u2 = URL.createObjectURL(new Blob([bytes], { type: img }));
      previewBox.replaceChildren(ph, el('div', { class: 'imgview' }, el('img', { src: u2, alt: e.name })));
    } else {
      const lim = 256 * 1024, big = bytes.length > lim;
      const text = decodeText(big ? bytes.subarray(0, lim) : bytes, 'utf8');
      previewBox.replaceChildren(ph, el('textarea', { readonly: true, class: S.wrap ? 'wrap' : '' }, text + (big ? `\n\n… showing the first ${fmtBytes(lim)} of ${fmtBytes(bytes.length)}` : '')));
    }
  }
  const splitBar = el('div', { class: 'fb-split', title: 'Drag to resize' });
  splitBar.addEventListener('pointerdown', e => {
    e.preventDefault(); splitBar.setPointerCapture(e.pointerId); splitBar.classList.add('drag');
    const r = wrap.getBoundingClientRect();
    const mv = ev => {
      const fromTop = ev.clientY - r.top, fromBottom = r.bottom - ev.clientY;
      wrap.style.setProperty('--fb-list', Math.max(0.3, fromTop / 40).toFixed(2));
      wrap.style.setProperty('--fb-prev', Math.max(0.3, fromBottom / 40).toFixed(2));
    };
    const up = () => { splitBar.classList.remove('drag'); splitBar.removeEventListener('pointermove', mv); splitBar.removeEventListener('pointerup', up); };
    splitBar.addEventListener('pointermove', mv); splitBar.addEventListener('pointerup', up);
  });
  wrap.append(head, list, splitBar, previewBox);
  body.append(wrap);
}

// Archive modules that either extract one file or - with the name field left blank - print a plain-text
// "size  name" listing (and nothing else useful comes back, since the client never sees the other entries'
// raw bytes: for an encrypted archive only the server/Python side could decrypt them). Mapped to the index
// of their "Extract file (name)" argument so a listing row can be clicked to fill it in and re-bake.
const EXTRACT_OPS = { 'Unzip': 0, '7-Zip Extract': 0, 'Untar': 0, 'CPIO Extract': 0, 'RAR Extract': 0 };
function lastActiveExtractStep() {
  for (let i = S.recipe.length - 1; i >= 0; i--) {
    const op = S.recipe[i];
    if (op.disabled) continue;
    return Object.hasOwn(EXTRACT_OPS, op.module) ? { op, i, argIdx: EXTRACT_OPS[op.module] } : null;
  }
  return null;
}
function parseExtractListing(u) {
  if (u.length > 1 << 20) return null;   // not worth decoding huge output just to check
  const text = decodeText(u, 'utf8');
  if (!text.endsWith("Set 'Extract file' to a name above to extract it.")) return null;
  const entries = [];
  for (const line of text.split('\n')) { const m = /^\s*(\d+)  (.+)$/.exec(line); if (m) entries.push({ name: m[2], size: +m[1] }); }
  return entries.length ? entries : null;
}
function renderExtractListing(body, entries, step) {
  const wrap = el('div', { class: 'filebrowser' });
  const head = el('div', { class: 'fb-head' }, el('b', {}, step.op.module), `${entries.length} file${entries.length === 1 ? '' : 's'} listed`);
  const note = el('div', { class: 'fb-note', style: 'padding:8px 10px;color:var(--dim)' }, `This step's "Extract file" field is blank, so it only lists what's inside - click a file below to extract it (fills in the field and re-runs the recipe).`);
  const table = el('table', { class: 'fb-table' }, el('thead', {}, el('tr', {}, el('th', {}, 'Name'), el('th', {}, 'Size'))),
    el('tbody', {}, entries.map(e => el('tr', { class: 'row', onclick: () => { step.op.args[step.argIdx] = e.name; S.stepTo = null; S.inspect = null; persist(); commitArg(); renderRecipe(); scheduleBake(true); } },
      el('td', {}, el('div', { class: 'nm' }, icon('file'), el('span', { class: 't' }, e.name))), el('td', { class: 'sz' }, fmtBytes(e.size))))));
  wrap.append(head, note, el('div', { class: 'fb-list' }, table));
  body.append(wrap);
}
// ---------------------------------------------------------------- output
function renderOutput() {
  const res = S.res, u = S.out, body = $('#outBody'); let view = $('#outView').value;
  const ta = $('#output');
  if (res?.error) showBanner('err', `Step ${res.error.step + 1} (${res.error.module}): ${res.error.message}`);
  else if (S.inspect != null) showBanner('info', `Showing the output of step ${S.inspect + 1}. `, el('button', { class: 'btn', onclick: () => { S.inspect = null; bake(); } }, 'Show final output'));
  else if (S.stepTo != null) showBanner('info', `Stepping: executed up to step ${S.stepTo + 1} of ${S.recipe.length}. `, el('button', { class: 'btn', onclick: () => { S.stepTo = null; bake(); } }, 'Bake all'));
  else if (res?.pausedAt != null) showBanner('info', `Paused at breakpoint before step ${res.pausedAt + 1}. Press Step to continue.`);
  else showBanner('', null);
  const img = sniffImage(u);
  const pdf = sniffPdf(u);
  const archiveKind = sniffArchive(u);
  const extractStep = (!res?.error && !archiveKind) ? lastActiveExtractStep() : null;
  const listing = extractStep && extractStep.op.args[extractStep.argIdx] === '' ? parseExtractListing(u) : null;
  // on error the engine falls back to showing the last good (pre-error) bytes; never dress that up as a
  // successful render/listing - a stale file browser or render next to the error banner reads as "it
  // worked". This overrides even a manually-picked view, since showing it would otherwise hide the error.
  if (res?.error) view = 'text';
  else if (view === 'auto') view = res?.html ? 'render' : (img || pdf) ? 'render' : (archiveKind || listing) ? 'files' : 'text';
  // a manually-picked "Files" view only makes sense when the output actually looks like an archive, or is
  // an Unzip/7-Zip-Extract-style text listing we can turn into a clickable one. When a step (e.g. Unzip
  // with the right password) legitimately succeeds and produces plain file content instead, drop back to
  // a normal view rather than stopping at a dead-end message the user has to click through every time.
  else if (view === 'files' && !archiveKind && !listing) {
    view = res?.html ? 'render' : (img || pdf) ? 'render' : 'text';
    if ($('#outView').value !== 'auto') $('#outView').value = 'auto';
  }
  if (S.blobUrl) { URL.revokeObjectURL(S.blobUrl); S.blobUrl = null; }
  [...body.children].forEach(c => { if (c !== ta && c.id !== 'outHighlights') c.remove(); }); ta.hidden = false;
  $('#outHighlights').hidden = true;
  const more = $('#outMore'); more.replaceChildren();
  if (view === 'files') {
    ta.hidden = true;
    if (archiveKind) renderFileBrowser(body, u, archiveKind); else renderExtractListing(body, listing, extractStep);
    $('#outStats').textContent = `${u.length.toLocaleString()} bytes`; return;
  }
  const showText = !(view === 'render' && (res?.html || img || pdf));
  if (!showText) {
    ta.hidden = true;
    if (res?.html) {
      const doc = `<!doctype html><meta charset="utf-8"><style>body{margin:14px;font:13px/1.5 ui-monospace,Consolas,monospace;color:${document.documentElement.dataset.theme === 'light' ? '#12203a' : '#d9e6ff'};background:transparent}table{border-collapse:collapse}td,th{border:1px solid #4a6a9a;padding:4px 10px}img,svg{max-width:100%}</style>` + new TextDecoder().decode(u);
      body.append(el('iframe', { class: 'render', sandbox: '', srcdoc: doc, title: 'Rendered output' }));
    } else if (img) { S.blobUrl = URL.createObjectURL(new Blob([u], { type: img })); body.append(el('div', { class: 'imgview' }, el('img', { src: S.blobUrl, alt: 'output image' }))); }
    else { S.blobUrl = URL.createObjectURL(new Blob([u], { type: pdf })); body.append(el('iframe', { class: 'render', src: S.blobUrl, title: 'PDF preview' })); }
  } else {
    const lim = view === 'hex' ? Math.floor(S.viewLimit / 4) : S.viewLimit, big = u.length > lim, src = big ? u.subarray(0, lim) : u;
    let t; if (view === 'hex') t = hexdump(u, lim); else if (view === 'base64') t = b64enc(src); else t = decodeText(src, view === 'latin1' ? 'latin1' : 'utf8');
    S.outputRawText = t;
    ta.value = view === 'hex' || view === 'base64' ? t : visibleControls(t);
    if (big) {
      const shown = view === 'hex' ? lim : src.length;
      more.append(el('span', { class: 'note' }, `showing the first ${fmtBytes(shown)} of ${fmtBytes(u.length)}`),
        el('button', { class: 'btn', title: 'Show another 1 MB', onclick: () => { S.viewLimit += 1 << 20; renderOutput(); } }, '+1 MB'),
        el('button', { class: 'btn', title: 'Show everything (can freeze the page for large outputs)', onclick: () => { if (u.length < (8 << 20) || confirm(`Showing ${fmtBytes(u.length)} in the text box may freeze the page for a long time. Continue?`)) { S.viewLimit = u.length * 4; renderOutput(); } } }, 'Show all'));
    }
  }
  const lines = u.length ? countNl(u) + 1 : 0;
  $('#outStats').textContent = `${u.length.toLocaleString()} bytes · ${lines.toLocaleString()} lines` + (img ? ` · ${img.split('/')[1]}` : pdf ? ' · pdf' : '');
  applyWrap();
  if (!$('#findbar').hidden) findRun(); else paintOutputHighlights();
}

function applyWrap() { $('#output').classList.toggle('wrap', S.wrap); $('#input').classList.toggle('wrap', S.wrap); $('#btnWrap').classList.toggle('on', S.wrap); $('#btnWrapIn').classList.toggle('on', S.wrap); paintOutputHighlights(); }
function setPane(p) { document.body.dataset.pane = p; LS.set('pane', p); $$('#mtabs button').forEach(b => b.classList.toggle('on', b.dataset.p === p || (p === 'io' && b.dataset.p === 'ops' && innerWidth > 760))); }
const narrow = () => matchMedia('(max-width: 760px)').matches;

// ---------------------------------------------------------------- input / tabs
function renderInput() {
  const inp = cur(), ta = $('#input'); $('#inEnc').value = inp.enc;
  if (inp.big) {
    const sample = inp.bytes.subarray(0, 4096);
    let nonPrintable = 0; for (let i = 0; i < sample.length; i++) { const b = sample[i]; if (b < 9 || (b > 13 && b < 32) || b === 127) nonPrintable++; }
    const binary = nonPrintable / sample.length > 0.05;
    const kind = sniffArchive(inp.bytes) || (sniffImage(inp.bytes) ? 'image' : null);
    // the full bytes are always used for baking regardless of this - only the box's own display is capped,
    // since laying out megabytes of text in a <textarea> freezes the page. Binary data is never worth
    // showing as "text" here (it's unreadable mojibake that reads as corruption), so say so plainly instead.
    ta.value = binary
      ? `[ ${inp.name}: ${fmtBytes(inp.bytes.length)} of binary data${kind ? ` (looks like ${kind.toUpperCase()})` : ''} - too large and not text, so it's not shown here. The full file is still used when you bake the recipe. ]`
      : `[ ${inp.name}: ${fmtBytes(inp.bytes.length)} loaded — too large to edit in the box. Showing the first 4 KB ]\n\n` + visibleControls(decodeText(sample, 'latin1'));
    ta.readOnly = true;
  }
  else { ta.readOnly = false; inp._rawText = decodeText(inp.bytes, inp.enc); inp._displayText = visibleControls(inp._rawText); ta.value = inp._displayText; }
  inputStats(); renderTabs();
}
function inputStats() { const b = cur().bytes; $('#inStats').textContent = `${b.length.toLocaleString()} bytes · ${(b.length ? countNl(b) + 1 : 0).toLocaleString()} lines`; }
function renderTabs() {
  const box = $('#inTabs'); box.replaceChildren();
  S.inputs.forEach((t, i) => box.append(el('div', { class: 'tab' + (i === S.tab ? ' on' : ''), onclick: () => { S.tab = i; S.inspect = null; renderInput(); persist(); scheduleBake(true); } }, t.name,
    S.inputs.length > 1 ? el('span', { class: 'x', onclick: e => { e.stopPropagation(); closeTab(i); } }, '×') : null)));
  box.append(el('div', { class: 'tab', title: 'New input tab', onclick: () => { S.inputs.push({ name: `Input ${S.inputs.length + 1}`, bytes: new Uint8Array(0), enc: 'utf8', out: null, big: false }); S.tab = S.inputs.length - 1; renderInput(); persist(); scheduleBake(true); } }, '+'));
}
function closeTab(i) { S.inputs.splice(i, 1); S.tab = Math.min(S.tab, S.inputs.length - 1); renderInput(); persist(); scheduleBake(true); }
function setInputBytes(u8, name, enc) {
  const inp = cur(); inp.bytes = u8; if (name) inp.name = name;
  // Large binary artifacts should use the bounded preview instead of rendering
  // hundreds of thousands of control pictures in the textarea. Keep the full
  // Uint8Array available to the recipe engine for forensic processing.
  const probe = u8.subarray(0, Math.min(u8.length, 4096));
  let controls = 0;
  for (const b of probe) if (b < 9 || (b > 13 && b < 32) || b === 127) controls++;
  inp.big = u8.length > (1 << 20) ||
    (u8.length > (256 << 10) && controls > probe.length * 0.05);
  if (enc) inp.enc = enc; renderInput(); S.inspect = null; scheduleBake(true); persist();
}
async function loadFiles(files) {
  const list = [...files]; if (!list.length) return;
  for (let k = 0; k < list.length; k++) {
    const f = list[k], u = new Uint8Array(await f.arrayBuffer()); let enc = 'utf8';
    try { new TextDecoder('utf-8', { fatal: true }).decode(u.subarray(0, 1 << 16)); } catch { enc = 'latin1'; }
    if (k > 0 || cur().bytes.length) { S.inputs.push({ name: f.name, bytes: new Uint8Array(0), enc, out: null, big: false }); S.tab = S.inputs.length - 1; }
    setInputBytes(u, f.name, enc);
  }
  toast(`Loaded ${list.length} file${list.length > 1 ? 's' : ''}`);
}

// ---------------------------------------------------------------- persistence / sharing
// A workspace belongs to a *browser tab*, not the origin. sessionStorage survives
// reloads in that tab, while a normally opened new tab/window starts with a clean
// recipe, inputs and output. Never put input/output bytes in localStorage.
const WORKSPACE_KEY = 'hexspindle.workspace.v1';
let workspaceWarned = false;
let restoredViewState = null;
function workspaceSnapshot() {
  return {
    version: 1,
    recipe: S.recipe.map(o => ({ ...o, id: undefined })),
    inputs: S.inputs.map(i => ({ name: i.name, enc: i.enc, bytes: b64enc(i.bytes) })),
    tab: S.tab, auto: S.auto, stepTo: S.stepTo, inspect: S.inspect,
    // Store actual bytes rather than the visible control-picture representation.
    out: S.res ? b64enc(S.out) : null,
    res: S.res ? { html: S.res.html, steps: S.res.steps, error: S.res.error,
      pausedAt: S.res.pausedAt, ms: S.res.ms, size: S.res.size } : null,
    outTab: S.outputTab ?? S.tab, outputDirty: !!S.outputDirty,
    outView: $('#outView').value, viewLimit: S.viewLimit,
    find: { open: !$('#findbar').hidden, term: $('#findInput').value,
      regex: $('#findRegex').checked },
    scroll: { input: $('#input').scrollTop, output: $('#output').scrollTop,
      recipe: $('#recipeList').scrollTop },
  };
}
function saveWorkspace() {
  let state;
  try { state = workspaceSnapshot(); sessionStorage.setItem(WORKSPACE_KEY, JSON.stringify(state)); return; }
  catch (e) {
    // Large inputs or outputs may exceed the browser's tab-storage quota. Keep
    // the recipe if possible rather than silently leaving an obsolete snapshot.
    try {
      const fallback = state || workspaceSnapshot();
      fallback.out = null; fallback.res = null;
      sessionStorage.setItem(WORKSPACE_KEY, JSON.stringify(fallback));
      if (!workspaceWarned) toast('Output too large for tab storage. Recipe and inputs will survive refresh; output must be baked again.', true);
    } catch {
      try {
        sessionStorage.setItem(WORKSPACE_KEY, JSON.stringify({ version: 1, recipe: serialRecipe(),
          inputs: [{ name: 'Input 1', enc: 'utf8', bytes: '' }], tab: 0, partial: true }));
      } catch { /* session storage might be disabled */ }
      if (!workspaceWarned) toast('Tab storage is full or unavailable. Large inputs/outputs may not survive refresh; save them to files.', true);
    }
    workspaceWarned = true;
  }
}
const persist = debounce(saveWorkspace, 200);
function restoreWorkspace() {
  try {
    const raw = sessionStorage.getItem(WORKSPACE_KEY);
    if (!raw) return false;
    const saved = JSON.parse(raw);
    if (saved.version !== 1 || !Array.isArray(saved.inputs) || !saved.inputs.length ||
        !Array.isArray(saved.recipe)) return false;
    const inputs = saved.inputs.map(i => {
      if (typeof i.bytes !== 'string') throw new Error('Invalid stored input');
      const bytes = b64dec(i.bytes);
      return { name: String(i.name || 'Input'), enc: ['utf8', 'latin1', 'hex', 'base64'].includes(i.enc) ? i.enc : 'utf8',
        bytes, out: null, big: bytes.length > (1 << 20) };
    });
    const recipe = saved.recipe.filter(o => o && typeof o.module === 'string' && S.mods[o.module])
      .map(o => Object.assign(newOp(o.module), { args: Array.isArray(o.args) ? o.args : defaultArgs(S.mods[o.module]),
        disabled: !!o.disabled, breakpoint: !!o.breakpoint, collapsed: !!o.collapsed, parallel: !!o.parallel }));
    S.inputs = inputs; S.recipe = recipe;
    S.tab = Math.max(0, Math.min(inputs.length - 1, Number(saved.tab) || 0));
    S.auto = saved.auto !== false;
    S.stepTo = Number.isInteger(saved.stepTo) ? saved.stepTo : null;
    S.inspect = Number.isInteger(saved.inspect) ? saved.inspect : null;
    S.viewLimit = Number.isFinite(saved.viewLimit) ? Math.max(VIEW_STEP, saved.viewLimit) : VIEW_STEP;
    S.res = saved.res && typeof saved.out === 'string'
      ? { ...saved.res, output: b64dec(saved.out) } : null;
    S.out = S.res?.output || new Uint8Array(0);
    S.outputTab = Number.isInteger(saved.outTab) ? saved.outTab : S.tab;
    S.outputDirty = !!saved.outputDirty;
    if (S.res && S.inputs[S.outputTab]) S.inputs[S.outputTab].out = { bytes: S.out, html: S.res.html };
    restoredViewState = saved;
    return true;
  } catch (e) {
    try { sessionStorage.removeItem(WORKSPACE_KEY); } catch { /* unavailable */ }
    return false;
  }
}
const u8url = s => btoa(String.fromCharCode(...new TextEncoder().encode(s))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
const urlu8 = s => new TextDecoder().decode(b64dec(s.replace(/-/g, '+').replace(/_/g, '/')));
function shareLink() {
  const rec = u8url(JSON.stringify(serialRecipe().map(o => [o.module, o.args, o.disabled ? 1 : 0, o.breakpoint ? 1 : 0, o.parallel ? 1 : 0]))); const b = cur().bytes;
  return location.origin + '/#r=' + rec + (b.length && b.length < 4000 ? '&i=' + b64enc(b).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '') : '');
}

// Imported {"op": ..., "args": [...]} recipes order some arguments differently; map them to HexSpindle's.
const importedMode = o => { const sp = S.mods['Find / Replace'].args[2].options; return sp.find(x => x.startsWith((o || 'Regex').slice(0, 5))) || 'Regex'; };
const IMPORT_ARG_COMPAT = {
  'Find / Replace': a => { const f = a[0]; const str = f && typeof f === 'object' ? f.string : f; const mode = (f && f.option) || 'Regex';
    return [str, a[1], importedMode(mode), a[2], a[3], a[4], a[5]]; },
  'Regular expression': a => {
    let rx = a[1]; const built = S.mods['Regular expression'].args[0].presets.find(p => p[0] === a[0]);
    if (!rx && built) rx = built[1];
    const fmt = { 'Highlight matches': 'Highlight matches', 'List matches': 'List matches', 'List capture groups': 'List capture groups', 'List matches with capture groups': 'List matches with capture groups' }[a[8]] || 'Highlight matches';
    return [rx, a[2], a[3], a[4], a[7] && fmt === 'List matches' ? 'Count matches' : fmt]; },
};
function loadRecipe(list, quiet) {
  const ops = [];
  for (const r of list) {
    const name = Array.isArray(r) ? r[0] : (r.module || r.op); let args = Array.isArray(r) ? r[1] : r.args; if (!S.mods[name]) { if (!quiet) toast(`Unknown operation skipped: ${name}`, true); continue; }
    if (!Array.isArray(r) && !r.module && r.op && IMPORT_ARG_COMPAT[name]) { try { args = IMPORT_ARG_COMPAT[name](args || []); } catch { /* keep as is */ } }
    const o = newOp(name); (args || []).forEach((v, i) => {
      const sp = S.mods[name].args[i]; if (!sp || v == null) return;
      if (sp.type === 'toggle') o.args[i] = typeof v === 'object' ? { string: v.string ?? '', option: sp.options.includes(v.option) ? v.option : sp.option } : { string: String(v), option: sp.option };
      else if (typeof v === 'object') { if (v.string === undefined) return; o.args[i] = v.string; } else o.args[i] = sp.type === 'number' ? Number(v) : sp.type === 'boolean' ? !!v : v;
    });
    o.disabled = Array.isArray(r) ? !!r[2] : !!r.disabled; o.breakpoint = Array.isArray(r) ? !!r[3] : !!r.breakpoint; o.parallel = Array.isArray(r) ? !!r[4] : !!r.parallel; ops.push(o);
  }
  S.recipe = ops; normalizeParallelLinks(); S.stepTo = null; S.inspect = null; renderRecipe(); hist.push(); persist(); scheduleBake(true);
}


// ---- find-in-output bar, plus overlays for matches and control characters.
const FIND = { idx: -1, matches: [] };

function paintOutputHighlights() {
  const layer = $('#outHighlights'), ta = $('#output');
  if (!layer || ta.hidden) { if (layer) layer.hidden = true; return; }
  const source = ta.value;
  const searching = !$('#findbar').hidden;
  const controls = /[\u2400-\u2408\u240b-\u241f\u2421]/.test(source);
  if (!controls && (!searching || !FIND.matches.length)) {
    layer.hidden = true;
    layer.replaceChildren();
    return;
  }
  layer.hidden = false;
  layer.classList.toggle('wrap', S.wrap);
  layer.style.right = Math.max(0, ta.offsetWidth - ta.clientWidth) + 'px';
  layer.style.bottom = Math.max(0, ta.offsetHeight - ta.clientHeight) + 'px';

  const fragment = document.createDocumentFragment();
  let controlCount = 0;
  function appendText(parent, value) {
    const pattern = /[\u2400-\u2408\u240b-\u241f\u2421]/g;
    let last = 0, m;
    while ((m = pattern.exec(value)) !== null && controlCount < 1500) {
      if (m.index > last) parent.append(document.createTextNode(value.slice(last, m.index)));
      parent.append(el('span', { class: 'ctrl' }, m[0]));
      controlCount++;
      last = m.index + m[0].length;
    }
    if (last < value.length) parent.append(document.createTextNode(value.slice(last)));
  }

  let matches = searching ? FIND.matches : [];
  if (matches.length > 1600) {
    const start = Math.max(0, FIND.idx - 300);
    matches = [...matches.slice(0, 800), ...matches.slice(start, start + 600)];
    matches.sort((a, b) => a[0] - b[0]);
  }
  let at = 0;
  for (const [start, end] of matches) {
    if (start < at || end > source.length) continue;
    appendText(fragment, source.slice(at, start));
    const active = searching && FIND.idx >= 0 &&
      FIND.matches[FIND.idx]?.[0] === start && FIND.matches[FIND.idx]?.[1] === end;
    const mark = el('mark', { class: 'hit' + (active ? ' cur' : '') });
    appendText(mark, source.slice(start, end));
    fragment.append(mark);
    at = end;
  }
  appendText(fragment, source.slice(at));
  layer.replaceChildren(fragment);
  layer.scrollTop = ta.scrollTop;
  layer.scrollLeft = ta.scrollLeft;
}
function syncOutputHighlights() {
  const layer = $('#outHighlights');
  if (layer && !layer.hidden) {
    layer.scrollTop = $('#output').scrollTop;
    layer.scrollLeft = $('#output').scrollLeft;
  }
}
function findRun() {
  if ($('#findbar').hidden) return;
  const term = $('#findInput').value, useRx = $('#findRegex').checked;
  const ta = $('#output'); FIND.matches = []; FIND.idx = -1;
  if (ta.hidden) { $('#findCount').textContent = 'Text view only'; paintOutputHighlights(); persist(); return; }
  if (!term) { $('#findCount').textContent = ''; paintOutputHighlights(); persist(); return; }
  const text = ta.value;
  try {
    const rx = new RegExp(useRx ? term : term.replace(/[.*+?^{}$()|[\]\\]/g, '\\$&'), 'gi');
    let m; let guard = 0;
    while ((m = rx.exec(text)) && guard++ < 20000) {
      FIND.matches.push([m.index, m.index + (m[0].length || 1)]);
      if (!m[0].length) rx.lastIndex++;
    }
  } catch { $('#findCount').textContent = 'Bad regex'; paintOutputHighlights(); persist(); return; }
  $('#findCount').textContent = FIND.matches.length ? '0 / ' + FIND.matches.length : 'No matches';
  if (FIND.matches.length) findGo(0); else paintOutputHighlights();
  persist();
}
function findGo(delta) {
  if (!FIND.matches.length) return;
  FIND.idx = ((FIND.idx === -1 ? 0 : FIND.idx + delta) % FIND.matches.length + FIND.matches.length) % FIND.matches.length;
  const [start, end] = FIND.matches[FIND.idx];
  const ta = $('#output');
  // The overlay marks the match; selecting inside the output textarea can
  // steal keyboard focus in some browsers, preventing further search typing.
  $('#findCount').textContent = (FIND.idx + 1) + ' / ' + FIND.matches.length;
  paintOutputHighlights();
  // Follow the highlighted position, including long wrapped lines. The mirror
  // has the same typography and wrapping as the output editor.
  const current = $('#outHighlights')?.querySelector?.('mark.hit.cur');
  if (current && Number.isFinite(current.offsetTop)) {
    ta.scrollTop = Math.max(0, current.offsetTop - ta.clientHeight * 0.3);
    if (!S.wrap && Number.isFinite(current.offsetLeft)) {
      const x = current.offsetLeft;
      if (x < ta.scrollLeft + 14 || x > ta.scrollLeft + ta.clientWidth - 50)
        ta.scrollLeft = Math.max(0, x - 40);
    }
    syncOutputHighlights();
  } else {
    const lineHeight = parseFloat(getComputedStyle(ta).lineHeight) || 19.5;
    const linesBefore = ta.value.slice(0, start).split('\n').length;
    ta.scrollTop = Math.max(0, (linesBefore - 4) * lineHeight);
    syncOutputHighlights();
  }
}
function findOpen() {
  const bar = $('#findbar'); bar.hidden = false;
  $('#findInput').focus(); $('#findInput').select(); findRun(); persist();
}
function findClose() {
  $('#findbar').hidden = true;
  $('#findCount').textContent = '';
  FIND.idx = -1; FIND.matches = [];
  paintOutputHighlights();
  persist();
}

// ---- batch mode: run the current recipe over every file in a folder/zip, download a zip of results
function batchOpen() {
  const examples = [
    ['Defang every IOC in a folder of threat-intel notes', 'Recipe: Defang IP Address → Defang URL. Point Batch at a folder of .txt files; each one comes back with its IPs/URLs safely defanged.'],
    ['Decode & re-hash a directory of base64 blobs', 'Recipe: From Base64 → SHA2. Drop in a folder of *.b64 files; get back one hash per file instead of running them through the recipe one at a time.'],
    ['Bulk-convert a folder of JSON configs to YAML', 'Recipe: JSON to YAML. Point Batch at a folder (or a .zip) of .json files and download a .zip of the converted .yaml files.'],
    ['Extract strings from a folder of binaries', 'Recipe: Extract Strings. Useful for running the same static-analysis step over many samples at once without re-pasting each one into the input box.'],
  ];
  openModal('Batch processing', [
    el('p', {}, 'Runs the ', el('b', {}, 'current recipe'), ' (exactly as built in the Recipe panel, left) over ', el('b', {}, 'every file'), ' you pick, instead of just the one input loaded above. It does not use whatever is currently in the Input panel - only the files you choose here.'),
    el('p', {}, 'Pick a ', el('b', {}, '.zip'), ' and each entry inside it is treated as a separate input, or pick ', el('b', {}, 'multiple individual files'), ' directly. Each file is baked through the recipe independently; the results are packaged into a single ', el('code', {}, 'batch-output.zip'), ' you download when it finishes. A file that errors is skipped (and listed with its error) - it does not stop the rest of the batch.'),
    el('div', { class: 'sub open', style: 'margin-top:14px' },
      el('div', { class: 'sub-h', style: 'cursor:default' }, 'Example uses'),
      el('div', { class: 'sub-body', style: 'display:block' }, examples.map(([t, d]) => el('div', { class: 'step-prev', style: 'width:100%;white-space:normal;line-height:1.5;padding:6px 0' }, el('b', {}, t), el('div', { style: 'color:var(--dim);margin-top:2px' }, d))))),
  ], [el('button', { class: 'btn primary', onclick: () => { closeModal(); $('#batchInput').click(); } }, 'Browse files…')]);
}
async function runBatch(files) {
  const list = [...files]; if (!list.length) return;
  openModal('Batch processing', el('div', { class: 'empty' }, 'Reading input…'));
  let items;
  try {
    if (list.length === 1 && /\.zip$/i.test(list[0].name)) {
      const zipBytes = new Uint8Array(await list[0].arrayBuffer());
      const entries = parseZipEntries(zipBytes).filter(e => !e.dir);
      items = await Promise.all(entries.map(async e => ({ name: e.name, bytes: await zipEntryBytes(zipBytes, e) })));
    } else {
      items = await Promise.all(list.map(async f => ({ name: f.webkitRelativePath || f.name, bytes: new Uint8Array(await f.arrayBuffer()) })));
    }
  } catch (e) { openModal('Batch processing', el('div', { class: 'empty' }, 'Could not read the input: ' + e.message)); return; }
  openModal('Batch processing', el('div', { class: 'empty' }, `Running the recipe over ${items.length} file(s)…`));
  const recipe = serialRecipe();
  const results = [], outEntries = [];
  for (const { name, bytes } of items) {
    try {
      const res = await engineBake(bytes, recipe);
      if (res.error) results.push({ name, ok: false, error: res.error.message });
      else { results.push({ name, ok: true, size: res.output.length }); outEntries.push([name, res.output]); }
    } catch (e) { results.push({ name, ok: false, error: e.message }); }
  }
  const ok = results.filter(x => x.ok).length;
  const rows = results.map(x => el('div', { class: 'batch-row' }, el('span', { class: 'nm' }, x.name), x.ok ? el('span', { class: 'ok' }, fmtBytes(x.size)) : el('span', { class: 'err' }, x.error)));
  const zipData = await buildZip(outEntries);
  openModal('Batch processing', [el('div', {}, `${ok} / ${results.length} file(s) processed successfully.`), el('div', { style: 'max-height:320px;overflow:auto;margin-top:10px' }, rows)],
    [el('button', { class: 'btn primary', onclick: () => download('batch-output.zip', zipData, 'application/zip'), disabled: !ok }, 'Download results.zip')]);
}
// Minimal STORE-only (uncompressed) zip writer, used to package Batch's results for download.
function crc32(buf) {
  let c, crc = 0xFFFFFFFF;
  for (let i = 0; i < buf.length; i++) { c = (crc ^ buf[i]) & 0xFF; for (let k = 0; k < 8; k++) c = c & 1 ? (c >>> 1) ^ 0xEDB88320 : c >>> 1; crc = (crc >>> 8) ^ c; }
  return (crc ^ 0xFFFFFFFF) >>> 0;
}
async function buildZip(entries) {
  const enc = new TextEncoder(); const parts = []; const central = []; let offset = 0;
  for (const [name, data] of entries) {
    const nameBytes = enc.encode(name), crc = crc32(data), dv = new DataView(new ArrayBuffer(30));
    dv.setUint32(0, 0x04034b50, true); dv.setUint16(4, 20, true); dv.setUint16(6, 0, true); dv.setUint16(8, 0, true); dv.setUint16(10, 0, true); dv.setUint16(12, 0, true);
    dv.setUint32(14, crc, true); dv.setUint32(18, data.length, true); dv.setUint32(22, data.length, true); dv.setUint16(26, nameBytes.length, true); dv.setUint16(28, 0, true);
    parts.push(new Uint8Array(dv.buffer), nameBytes, data);
    const cdv = new DataView(new ArrayBuffer(46));
    cdv.setUint32(0, 0x02014b50, true); cdv.setUint16(4, 20, true); cdv.setUint16(6, 20, true); cdv.setUint32(16, crc, true); cdv.setUint32(20, data.length, true);
    cdv.setUint32(24, data.length, true); cdv.setUint16(28, nameBytes.length, true); cdv.setUint32(42, offset, true);
    central.push([new Uint8Array(cdv.buffer), nameBytes]);
    offset += 30 + nameBytes.length + data.length;
  }
  const cdStart = offset; let cdSize = 0;
  const cdParts = [];
  for (const [hdr, nameBytes] of central) { cdParts.push(hdr, nameBytes); cdSize += hdr.length + nameBytes.length; }
  const edv = new DataView(new ArrayBuffer(22));
  edv.setUint32(0, 0x06054b50, true); edv.setUint16(8, entries.length, true); edv.setUint16(10, entries.length, true); edv.setUint32(12, cdSize, true); edv.setUint32(16, cdStart, true);
  const all = [...parts, ...cdParts, new Uint8Array(edv.buffer)];
  const total = all.reduce((n, a) => n + a.length, 0); const out = new Uint8Array(total); let p = 0;
  for (const a of all) { out.set(a, p); p += a.length; }
  return out;
}

// ---------------------------------------------------------------- modals
function openModal(title, body, footer) {
  const m = $('#modal'); m.replaceChildren(...[el('div', { class: 'modal-h' }, title, el('button', { class: 'icon-btn x', onclick: closeModal }, icon('x'))), el('div', { class: 'modal-b' }, body), footer ? el('div', { class: 'modal-f' }, footer) : null].filter(Boolean));
  $('#overlay').hidden = false;
}
function closeModal() { $('#overlay').hidden = true; $('#paletteOverlay').hidden = true; }

// Import/load are explicit actions. Selecting a saved recipe only previews it.
function loadText(text) {
  let parsed;
  try { parsed = parseRecipeText(text, S.mods); }
  catch (e) { toast('Cannot import recipe: ' + e.message, true); return false; }
  // Validate everything before changing the workspace. No silently skipped steps.
  loadRecipe(parsed.recipe, true);
  if (parsed.inputBytes !== null) setInputBytes(parsed.inputBytes, null, 'utf8');
  closeModal(); toast(`Imported ${parsed.recipe.length} step(s) from ${parsed.format}`);
  return true;
}

// Saved recipes persist across browser tabs in localStorage; active workspace is
// separate, per-tab sessionStorage. Empty input is a VALID stored input.
const sha256hex = async bytes => [...new Uint8Array(await crypto.subtle.digest('SHA-256', bytes))]
  .map(b => b.toString(16).padStart(2, '0')).join('');
const hasStored = (o, key) => Object.prototype.hasOwnProperty.call(o, key);
function loadSavedRecipes() {
  const raw = LS.get('savedRecipes', {});
  const result = Object.create(null);
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return result;
  for (const [name, profile] of Object.entries(raw)) {
    if (profile && typeof profile === 'object' && Array.isArray(profile.recipe) &&
        !['__proto__', 'constructor', 'prototype'].includes(name)) result[name] = profile;
  }
  return result;
}
function saveSavedRecipes(data) {
  // Unlike LS.set, saving a named recipe must NOT silently ignore storage failures.
  const json = JSON.stringify(data);
  localStorage.setItem('df.savedRecipes', json);
  if (localStorage.getItem('df.savedRecipes') !== json)
    throw new Error('Browser did not confirm the saved recipe');
}
function profilesPanel(onPick) {
  let list = loadSavedRecipes();
  const name = el('input', { type: 'text', placeholder: 'Recipe name…', maxlength: '100', style: 'flex:1' });
  const withIn = el('input', { type: 'checkbox' });
  const pin = el('input', { type: 'checkbox' });
  const sel = el('select', { style: 'flex:1;min-width:0' });
  const verifyMsg = el('div', { class: 'recipe-io-info', role: 'status' });
  const hasInput = p => hasStored(p, 'input') && typeof p.input === 'string';
  const clearResult = () => { verifyMsg.className = 'recipe-io-info'; verifyMsg.replaceChildren(); };
  const profileInfo = p => {
    clearResult();
    if (!p) return;
    const parts = [];
    if (hasInput(p)) parts.push(`Saved input: ${Math.max(0, Math.floor(p.input.length * 3 / 4) - (p.input.endsWith('==') ? 2 : p.input.endsWith('=') ? 1 : 0)).toLocaleString()} bytes (Base64)`);
    if (p.expectedHash) {
      parts.push(`Pinned output: ${Number.isInteger(p.outputBytes) ? p.outputBytes.toLocaleString() + ' bytes' : 'size unknown (older pin)'}`);
      parts.push(`SHA-256: ${p.expectedHash}`);
    }
    verifyMsg.textContent = parts.join(' · ');
  };
  function fill(value = '') {
    const options = [el('option', { value: '' }, 'Current recipe (unsaved)')];
    for (const n of Object.keys(list).sort((a, b) => a.localeCompare(b))) {
      const p = list[n];
      options.push(el('option', { value: n }, n + (hasInput(p) ? '  (+input)' : '') + (p.expectedHash ? '  📌' : '')));
    }
    sel.replaceChildren(...options);
    sel.value = hasStored(list, value) ? value : '';
  }
  fill();
  const pick = () => {
    const p = list[sel.value] || null;
    name.value = sel.value;
    withIn.checked = !!p && hasInput(p);
    pin.checked = !!p?.expectedHash;
    withIn.disabled = pin.checked;
    profileInfo(p);
    onPick?.(p, sel.value);
  };
  sel.onchange = pick;
  pin.onchange = () => {
    if (pin.checked) withIn.checked = true;
    withIn.disabled = pin.checked;
  };
  async function save() {
    const n = name.value.trim();
    if (!n) return toast('Enter a name for the current recipe', true);
    if (['__proto__', 'constructor', 'prototype'].includes(n)) return toast('That recipe name is reserved', true);
    const old = list[n];
    if (old && !confirm(`Replace "${n}" with the CURRENT working recipe?\n\nThis will replace the recipe, saved input and pinned baseline. Continue?`)) return;
    const recipe = serialRecipe(), input = cur().bytes.slice();
    const willPin = pin.checked, willIncludeInput = withIn.checked || willPin;
    if (willPin && recipe.some(o => !o.disabled && (S.mods[o.module]?.net || S.mods[o.module]?.nondeterministic))) {
      if (!confirm('This recipe uses network or nondeterministic operations. Pinning runs it now and future verification may differ. Continue?')) return;
    }
    const p = { recipe, saved: Math.floor(Date.now() / 1000) };
    if (willIncludeInput) p.input = b64enc(input);
    const button = saveBtn; button.disabled = true;
    try {
      if (willPin) {
        // Re-bake the exact captured recipe+input; never pin potentially stale,
        // errored, preview-only, or partial output currently displayed in the UI.
        const bakingRecipe = recipe.map(o => ({ ...o, breakpoint: false }));
        const j = await engineBake(input, bakingRecipe);
        if (j.error) throw new Error('Reference bake failed: ' + j.error.message);
        if (j.pausedAt != null) throw new Error('Reference bake stopped before completing');
        if (!(j.output instanceof Uint8Array)) throw new Error('Reference bake did not return bytes');
        p.expectedHash = await sha256hex(j.output);
        p.outputBytes = j.output.length;
        p.pinnedAt = Date.now();
      }
      // Commit in-memory state only after storage has accepted it.
      const updated = Object.assign(Object.create(null), list, { [n]: p });
      saveSavedRecipes(updated);
      list = updated;
      fill(n); pick();
      toast(willPin ? `Saved "${n}" with a verified output pin` : `Saved "${n}"`);
    } catch (e) { toast('Save failed: ' + e.message, true); }
    finally { button.disabled = false; }
  }
  const load = () => {
    const p = list[sel.value]; if (!p) return toast('Select a saved recipe first', true);
    let recipe;
    try { recipe = normaliseRecipe(p.recipe, S.mods).recipe; }
    catch (e) { return toast('Cannot load saved recipe: ' + e.message, true); }
    let input = null;
    try { if (hasInput(p)) input = b64dec(p.input); }
    catch (e) { return toast('Saved input is invalid: ' + e.message, true); }
    loadRecipe(recipe, true);
    if (input !== null) setInputBytes(input, sel.value, 'utf8');
    closeModal(); toast(`Loaded "${sel.value}"`);
  };
  const del = () => {
    const n = sel.value;
    if (!hasStored(list, n)) return toast('Select a saved recipe first', true);
    if (!confirm(`Delete saved recipe "${n}"? This does not change the working recipe.`)) return;
    const updated = Object.assign(Object.create(null), list);
    delete updated[n];
    try { saveSavedRecipes(updated); }
    catch (e) { return toast('Delete failed: ' + e.message, true); }
    list = updated; fill(); name.value = ''; withIn.checked = pin.checked = false;
    withIn.disabled = false; profileInfo(null); onPick?.(null, '');
    toast(`Deleted "${n}"`);
  };
  const verify = async () => {
    const n = sel.value, p = list[n];
    if (!p) return toast('Select a saved recipe first', true);
    if (!hasInput(p)) return toast('No saved input. Save with "With input" or "Pin output".', true);
    if (!p.expectedHash) return toast('This recipe has no pinned output. Save it with Pin output enabled.', true);
    verifyBtn.disabled = true;
    verifyMsg.className = 'recipe-io-info';
    verifyMsg.textContent = 'Verifying saved recipe and input…';
    const t0 = performance.now();
    try {
      const recipe = normaliseRecipe(p.recipe, S.mods).recipe.map(o => ({ ...o, breakpoint: false }));
      const j = await engineBake(b64dec(p.input), recipe);
      if (j.error) throw new Error(j.error.message);
      if (j.pausedAt != null || !(j.output instanceof Uint8Array)) throw new Error('Bake did not finish');
      const hash = await sha256hex(j.output);
      const ok = hash === p.expectedHash && (p.outputBytes == null || p.outputBytes === j.output.length);
      const ms = Math.round(performance.now() - t0);
      verifyMsg.className = 'recipe-io-info ' + (ok ? 'ok' : 'err');
      verifyMsg.textContent = `${ok ? '✓ MATCH' : '✗ MISMATCH'} · ${j.output.length.toLocaleString()} bytes · ${ms} ms\nExpected SHA-256: ${p.expectedHash}\nActual SHA-256:   ${hash}`;
    } catch (e) { verifyMsg.className = 'recipe-io-info err'; verifyMsg.textContent = 'Verification failed: ' + e.message; }
    finally { verifyBtn.disabled = false; }
  };
  name.addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); save(); } });
  const saveBtn = el('button', { class: 'btn', onclick: save }, 'Save current');
  const verifyBtn = el('button', { class: 'btn', onclick: verify }, 'Verify pin');
  return el('div', { class: 'card' }, el('h4', {}, 'Saved recipes'),
    el('div', { class: 'row', style: 'display:flex;gap:8px;align-items:center;flex-wrap:wrap' }, name,
      el('label', { class: 'switch', title: 'Include current input bytes when saving' }, withIn, el('i'), el('span', {}, 'With input')),
      el('label', { class: 'switch', title: 'Bake the CURRENT recipe with its current input; save the exact output SHA-256 for future regression verification' }, pin, el('i'), el('span', {}, 'Pin output')),
      saveBtn),
    el('div', { class: 'row', style: 'display:flex;gap:8px;align-items:center;flex-wrap:wrap' }, sel,
      el('button', { class: 'btn primary', onclick: load }, 'Load selected'), verifyBtn,
      el('button', { class: 'btn', onclick: del }, 'Delete')),
    verifyMsg,
    el('div', { class: 'desc' }, 'Select a saved recipe to PREVIEW it below without changing the working recipe. Save current always saves the active workspace. Pin output saves a SHA-256 baseline and input; Verify pin re-bakes those saved bytes. Named recipes are stored in this browser profile (localStorage).'));
}

function recipeIO() {
  let mode = 'json';
  // This is separate from S.recipe: previewing saved recipes MUST NOT load them.
  let source = { kind: 'current', profile: null };
  const body = el('div');
  const area = el('textarea', { spellcheck: 'false', 'aria-label': 'Recipe preview or imported recipe' });
  const tabs = el('div', { class: 'modal-tabs' });
  const message = el('div', { class: 'recipe-io-info', role: 'status' });
  const formats = [
    ['json', 'HexSpindle JSON'], ['cyber-json', 'CyberChef JSON'],
    ['cyber-chef', 'CyberChef Chef'], ['hex-link', 'HexSpindle link'],
    ['cyber-link', 'CyberChef link'],
  ];
  let importFileBtn, exportBtn;
  const getSource = () => {
    if (source.kind === 'parsed') return {
      recipe: source.parsed.recipe, inputBytes: source.parsed.inputBytes, label: 'Imported text',
    };
    if (source.kind === 'draft') {
      const parsed = parseRecipeText(area.value, S.mods);
      return { recipe: parsed.recipe, inputBytes: parsed.inputBytes, label: 'Imported text' };
    }
    if (source.kind === 'saved') {
      const p = source.profile;
      const valid = normaliseRecipe(p.recipe, S.mods);
      return { recipe: valid.recipe, inputBytes: hasStored(p, 'input') && typeof p.input === 'string' ? b64dec(p.input) : null,
        label: source.name };
    }
    return { recipe: serialRecipe(), inputBytes: cur().bytes, label: 'Current recipe' };
  };
  function errorMessage(e) {
    message.className = 'recipe-io-info err';
    message.textContent = `Cannot convert: ${e.message}. Choose HexSpindle JSON for HexSpindle-only operations.`;
    if (exportBtn) exportBtn.disabled = true;
  }
  function renderTabs() {
    tabs.replaceChildren(...formats.map(([value, label]) => el('button', {
      class: 'btn' + (mode === value ? ' on' : ''), onclick: () => {
        if (source.kind === 'draft') {
          // Do not discard manually pasted/edited text on a format switch.
          try { const parsed = parseRecipeText(area.value, S.mods); source = { kind: 'parsed', parsed }; }
          catch (e) { errorMessage(e); return; }
        }
        mode = value; renderTabs(); paint();
      },
    }, label)));
  }
  const paint = () => {
    try {
      const item = getSource();
      area.value = exportRecipeText(item.recipe, mode, {
        inputBytes: item.inputBytes, toBase64: b64enc,
        baseUrl: location.origin + location.pathname,
      });
      if (exportBtn) exportBtn.disabled = false;
      message.className = 'recipe-io-info';
      message.textContent = `${item.label} · ${item.recipe.length} step(s) · Preview only. Copy/Export use the displayed source.`;
    } catch (e) { area.value = ''; errorMessage(e); }
  };
  // Use one common preview painter for both manual source selection and tabs.
  function redraw() { renderTabs(); paint(); }
  const clearSelectedPreview = () => {
    const selected = profile.querySelector('select');
    if (selected) selected.value = '';
    const name = profile.querySelector('input[type=text]');
    if (name) name.value = '';
  };
  area.addEventListener('input', () => {
    source = { kind: 'draft' };
    clearSelectedPreview();
    message.className = 'recipe-io-info';
    message.textContent = 'Edited recipe text. Use Load recipe to apply, or switch formats to convert it.';
    if (exportBtn) exportBtn.disabled = false;
  });
  const profile = profilesPanel((p, n) => {
    source = p ? { kind: 'saved', profile: p, name: n } : { kind: 'current' };
    redraw();
  });
  const load = el('button', { class: 'btn primary', onclick: () => loadText(area.value) }, 'Load recipe');
  importFileBtn = el('button', { class: 'btn', onclick: () => {
    const picker = el('input', { type: 'file', accept: '.json,.txt,.recipe,.chef,.url,application/json,text/plain', onchange: async e => {
      const file = e.target.files[0]; if (!file) return;
      try {
        area.value = await file.text();
        source = { kind: 'draft' };
        clearSelectedPreview();
        message.className = 'recipe-io-info';
        message.textContent = `Imported ${file.name} for PREVIEW. Press Load recipe to activate it.`;
        if (exportBtn) exportBtn.disabled = false;
        area.focus();
      } catch (err) { toast('Import Recipe failed: ' + err.message, true); }
    }}); picker.click();
  } }, 'Import Recipe');
  exportBtn = el('button', { class: 'btn', onclick: () => {
    try {
      const item = getSource();
      const content = exportRecipeText(item.recipe, mode, {
        inputBytes: item.inputBytes, toBase64: b64enc,
        baseUrl: location.origin + location.pathname,
      });
      const filename = mode === 'json' ? 'hexspindle-recipe.json' : mode === 'cyber-json' ?
        'cyberchef-recipe.json' : mode === 'cyber-chef' ? 'cyberchef-recipe.txt' : 'recipe-link.txt';
      download(filename, content, mode.endsWith('json') ? 'application/json' : 'text/plain');
      toast(`Exported ${item.label}`);
    } catch (e) { errorMessage(e); toast(e.message, true); }
  } }, 'Export Recipe');
  body.append(profile, tabs, area,
    message,
    el('div', { class: 'desc' }, 'Formats: HexSpindle JSON, verified CyberChef JSON/Chef, and share links. Unsupported CyberChef operations or argument combinations are REJECTED, not silently dropped. Importing a file only previews it until Load recipe is pressed.'));
  redraw();
  openModal('Save / Load recipe', body, [
    importFileBtn, exportBtn,
    el('button', { class: 'btn', onclick: async () => {
      try { await navigator.clipboard.writeText(area.value); toast('Recipe text copied'); }
      catch (e) { errorMessage(e); toast('Copy failed: ' + e.message, true); }
    } }, 'Copy'),
    el('button', { class: 'btn', onclick: async () => {
      try {
        area.value = await navigator.clipboard.readText(); source = { kind: 'draft' };
        clearSelectedPreview();
        message.className = 'recipe-io-info'; message.textContent = 'Pasted recipe text. Press Load recipe to activate it.';
        exportBtn.disabled = false; area.focus();
      } catch { area.focus(); area.select(); toast('Clipboard blocked — press Ctrl+V instead', true); }
    } }, 'Paste'),
    load,
  ]);
  area.focus(); area.select();
}
const EXAMPLES = [
  { n: 'Decode a layered blob', cat: 'Basics', d: 'Base64 → hex → text. Try the Magic wand on the output too.', input: 'NDggNjUgNzggNTMgNzAgNjkgNmUgNjQgNmMgNjUgMjAgNzMgNjEgNzkgNzMgMjAgNjggNjUgNmMgNmMgNmY=', r: [['From Base64'], ['From Hex']] },
  { n: 'Gunzip a Base64 payload', cat: 'Basics', d: 'Classic: Base64 → gzip → text.', input: 'H4sIAAAAAAAC/8tIzcnJVyjPL8pJAQCFEUoNCwAAAA==', r: [['From Base64'], ['Gunzip']] },
  { n: 'Encode every line (Fork)', cat: 'Basics', d: 'Fork splits the input on lines, Merge joins the results.', input: 'alpha\nbeta\ngamma', r: [['Fork', '\\n', '\\n', false], ['To Base64'], ['Merge']] },
  { n: 'URL-decode nested encoding', cat: 'Basics', d: 'A value that was URL-encoded more than once.', input: 'a%2520b%2520c', r: [['URL Decode'], ['URL Decode']] },
  { n: 'Decode a data: URI', cat: 'Basics', d: 'Strip the data: URI scheme/MIME prefix, then Base64 decode what is left.', input: 'data:text/plain;base64,SGVsbG8gZnJvbSBhIGRhdGEgVVJJIQ==', r: [['Find / Replace', '^data:[^,]*,', '', 'Regex', true, false, false, false], ['From Base64']] },

  { n: 'Hash everything', cat: 'Hashing / Crypto', d: 'Every hash and checksum of the input at once.', input: 'hello world', r: [['Generate all hashes']] },
  { n: 'Decode a JWT', cat: 'Hashing / Crypto', d: 'Header and payload of a JSON Web Token.', input: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyfQ.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c', r: [['JWT Decode']] },
  { n: 'AES round trip', cat: 'Hashing / Crypto', d: 'Encrypt with AES-CBC then decrypt it again.', input: 'Attack at dawn!', r: [['AES Encrypt', { string: '00112233445566778899aabbccddeeff', option: 'Hex' }, { string: '000102030405060708090a0b0c0d0e0f', option: 'Hex' }, 'CBC', 'Raw', 'Hex'], ['AES Decrypt', { string: '00112233445566778899aabbccddeeff', option: 'Hex' }, { string: '000102030405060708090a0b0c0d0e0f', option: 'Hex' }, 'CBC', 'Hex', 'Raw']] },
  { n: 'Brute-force a Caesar cipher', cat: 'Hashing / Crypto', d: 'No key? Try every shift and eyeball which one reads as English.', input: 'Wkh wuhdvxuh lv exulhg dw plgqljkw', r: [['ROT13 Brute Force', true, true, false, 100, 0, true, '']] },
  { n: 'Generate a strong password', cat: 'Hashing / Crypto', d: 'A cryptographically random password, then check how strong it is.', input: '', r: [['Generate Password', 20, 1, true, true, true, true, true, true], ['Password Strength Analyser']] },

  { n: 'Extract & rank IPs from a log', cat: 'Forensics / IR', d: 'Pull IPv4 addresses out of a log, sorted and de-duplicated.', input: 'conn from 10.0.0.5 to 8.8.8.8 ok\nconn from 192.168.1.20 to 8.8.8.8 ok\nretry 10.0.0.5', r: [['Extract IP addresses', true, false, false, true, true, true]] },
  { n: 'Defang a malicious URL', cat: 'Forensics / IR', d: 'Make a malicious URL safe to paste in a report.', input: 'Visit http://evil.example.com/login?x=1 now', r: [['Defang URL']] },
  { n: 'Scan text for IOCs', cat: 'Forensics / IR', d: 'Pull IPs, domains, hashes, and emails out of pasted notes in one pass.', input: 'Beacon to 185.220.101.5, C2 domain bad-domain.example, dropped file hash 44d88612fea8a8f36de82e1278abb02f, contact admin@bad-domain.example', r: [['Extract IOCs']] },
  { n: 'Explain a cron expression', cat: 'Forensics / IR', d: 'Turn a cron schedule (e.g. from a persistence mechanism) into plain English.', input: '*/15 2-6 * * 1-5', r: [['Cron Expression Explainer']] },
  { n: 'Validate a credit card number', cat: 'Forensics / IR', d: 'Luhn-check a card number found in a dump.', input: '4111 1111 1111 1111', r: [['Luhn Checksum']] },
  { n: 'Decode a Punycode domain', cat: 'Forensics / IR', d: 'Spot homograph/IDN phishing domains by seeing their real Unicode form.', input: 'xn--pple-43d.com', r: [['From Punycode', true]] },

  { n: 'QR code', cat: 'Misc', d: 'Render text as a QR code image.', input: 'https://example.com', r: [['Generate QR Code']] },
  { n: 'Explain a regex', cat: 'Misc', d: 'A plain-English breakdown of what a pattern actually matches.', input: '^(?:\\d{1,3}\\.){3}\\d{1,3}$', r: [['Regex Explainer']] },
  { n: 'CSV to JSON', cat: 'Misc', d: 'Convert a small CSV table into an array of JSON objects.', input: 'name,age,city\nAda,36,London\nGrace,85,Arlington', r: [['CSV to JSON']] },
  { n: 'Diff two texts', cat: 'Misc', d: 'Two samples joined by a blank line - shows what changed between them.', input: 'line one\nline two\nline three\nline four\n\nline one\nline TWO\nline three\nline FOUR', r: [['Diff', '\\n\\n', 'Line', true, true, false, false]] },
  { n: 'Subnet calculator', cat: 'Misc', d: 'CIDR range, netmask, usable host count and range.', input: '10.20.0.0/22', r: [['Subnet Calculator']] },
];
function examples() {
  const cats = ['All', ...[...new Set(EXAMPLES.map(x => x.cat))]];
  let activeCat = 'All', q = '';
  const grid = el('div', { class: 'grid2' });
  const search = el('input', { type: 'search', placeholder: `Filter ${EXAMPLES.length} examples…`, style: 'width:100%;margin-bottom:10px' });
  const chips = el('div', { class: 'row', style: 'display:flex;gap:6px;flex-wrap:wrap;margin-bottom:12px' });
  const paint = () => {
    const ql = q.trim().toLowerCase();
    const shown = EXAMPLES.filter(x => (activeCat === 'All' || x.cat === activeCat) && (!ql || x.n.toLowerCase().includes(ql) || x.d.toLowerCase().includes(ql)));
    grid.replaceChildren(...(shown.length ? shown.map(x => el('div', { class: 'card', style: 'cursor:pointer', onclick: () => { loadRecipe(x.r.map(([n, ...a]) => [n, a, 0]), true); setInputBytes(new TextEncoder().encode(x.input), x.n); closeModal(); } },
      el('h4', {}, x.n), el('div', { class: 'desc' }, x.d), el('div', { class: 'chain' }, x.r.flatMap((r, i) => [i ? el('i', {}, '→') : null, el('span', {}, r[0])])))) : [el('div', { class: 'empty' }, 'No examples match.')]));
    chips.replaceChildren(...cats.map(c => el('span', { class: 'cat-chip' + (c === activeCat ? ' on' : ''), style: '--h:200;cursor:pointer', onclick: () => { activeCat = c; paint(); } }, c)));
  };
  search.addEventListener('input', () => { q = search.value; paint(); });
  paint();
  openModal('Examples', el('div', {}, search, chips, grid));
}
function help() {
  const rows = [['Ctrl + Enter', 'Bake'], ['Ctrl + K', 'Search operations (command palette)'], ['Ctrl + S', 'Save / load recipe'], ['Ctrl + Z', 'Undo recipe change (focus the recipe)'], ['Ctrl + Shift + Z / Ctrl + Y', 'Redo recipe change'], ['Esc', 'Close dialogs'],
    ['Double-click / drag', 'Add an operation to the recipe'], ['Eye icon', 'Inspect the output of a single step'], ['Flag icon', 'Breakpoint: pause before that step, then Step to continue'], ['Wand icon', 'Magic: suggest decoding chains for the output']];
  openModal('Help & shortcuts', el('div', {}, el('table', { class: 'keys' }, rows.map(r => el('tr', {}, el('td', {}, el('kbd', {}, r[0])), el('td', {}, r[1])))),
    el('p', { class: 'desc' }, 'Use Fork … Merge to run operations on each line, Register to capture regex groups into $R0 (group 1), $R1 (group 2)…, and Label / Jump / Conditional Jump for loops. Registers can be used in any text argument.'),
    el('p', { class: 'desc' }, `${Object.keys(S.mods).length} operations loaded. Input tabs let you keep several inputs; each is baked with the same recipe.`)));
}
async function magic() {
  const u = S.out.length ? S.out : cur().bytes;
  openModal('Magic', el('div', { class: 'empty' }, 'Searching for decoding chains…'));
  try {
    const found = await magicSearch(u.subarray(0, 1 << 18), 3);
    const rs = found.filter(x => x.path.length).slice(0, 15);
    openModal('Magic suggestions', rs.length ? rs.map(x => {
      const recipe = x.path.map(([module, args]) => ({ module, args }));
      const preview = new TextDecoder().decode(x.data.subarray(0, 160));
      return el('div', { class: 'card' }, el('div', { class: 'chain' }, recipe.map((o, i) => [i ? el('i', {}, '→') : null, el('span', {}, o.module)]), el('span', { class: 'score', style: 'background:none' }, `score ${x.score}`)),
        el('div', { class: 'snip' }, preview), el('div', {}, el('button', { class: 'btn', onclick: () => { recipe.forEach(o => S.recipe.push(newOp(o.module, o.args))); S.stepTo = null; commit(); closeModal(); } }, 'Add to recipe')));
    }) : el('div', { class: 'empty' }, 'No promising decodings found.'));
  } catch (e) { openModal('Magic', el('div', { class: 'empty' }, 'Magic failed: ' + e.message)); }
}

// ---- Suggest: an opt-in, local-first interface to either AI provider.
// Keys are held only in this page's memory. No keys are embedded
// in source code or sent to HexSpindle. Only provider requests receive
// them; optionally selected input samples are sent to the chosen provider.
function renderAIRecipeSuggestion(result, destination, sourceRecipe) {
  destination.replaceChildren();
  const header = el('div', { class: 'ai-suggest-summary' },
    el('b', {}, `Proposed recipe · ${result.steps.length} step${result.steps.length === 1 ? '' : 's'}`),
    result.summary ? el('p', {}, result.summary) : null,
    el('div', { class: 'desc' }, 'AI suggestions have not been executed. Review the arguments before applying.'));
  destination.append(header);
  for (const [i, step] of result.steps.entries()) {
    const spec = S.mods[step.name];
    const args = (spec?.args || []).map((arg, j) => {
      const value = step.args[j];
      const secret = /(?:secret|private key|password|passphrase|\bkey\b|\biv\b)/i.test(arg.name);
      const label = typeof value === 'boolean' ? (value ? 'true' : 'false')
        : value && typeof value === 'object' && !Array.isArray(value)
          ? `${value.option}: ${secret && value.string ? '••••' : (value.string || '(empty)')}`
          : secret && value ? '••••' : String(value ?? '(empty)');
      return el('div', { class: 'ai-suggest-arg', title: arg.hint || '' },
        el('span', { class: 'ai-suggest-arg-name' }, arg.name),
        el('code', { title: secret ? 'Sensitive parameter (hidden)' : label },
          label.length > 100 ? label.slice(0, 97) + '…' : label));
    });
    destination.append(el('section', { class: 'ai-suggest-step' },
      el('div', { class: 'ai-suggest-step-head' },
        el('span', { class: 'ai-suggest-step-num' }, String(i + 1)), el('b', {}, step.name)),
      el('p', {}, step.why || 'Suggested operation'),
      args.length ? el('div', { class: 'ai-suggest-args' }, args) : el('span', { class: 'desc' }, 'No arguments')));
  }
  if (result.warnings.length) destination.append(el('div', { class: 'ai-suggest-warnings' },
    el('b', {}, 'Check before applying'),
    el('ul', {}, result.warnings.map(w => el('li', {}, w)))));
  destination.append(el('button', { class: 'btn primary', type: 'button', onclick: () => {
    if (JSON.stringify(serialRecipe()) !== sourceRecipe && !confirm('The active recipe has changed since this suggestion was generated. Append these steps anyway?')) return;
    for (const step of result.steps) S.recipe.push(newOp(step.name, step.args));
    S.stepTo = null; S.inspect = null; commit(); closeModal();
  } }, `Add ${result.steps.length} configured step${result.steps.length === 1 ? '' : 's'} to recipe`));
}

async function suggestRecipe() {
  const savedProvider = LS.get('aiProvider', 'anthropic');
  const selectedProvider = Object.hasOwn(AI_PROVIDERS, savedProvider) ? savedProvider : 'anthropic';
  const provider = el('select', { class: 'ai-provider-choice', 'aria-label': 'Suggestion provider' },
    Object.entries(AI_PROVIDERS).map(([id, p]) => el('option', { value: id, selected: id === selectedProvider }, p.label)));
  const description = el('textarea', { id: 'aiSuggestionText', spellcheck: 'false',
    placeholder: 'Describe your goal, e.g. “Base64 decode, decompress, and extract URLs”.' });
  const includeSample = el('input', { type: 'checkbox', checked: false });
  const includeOutput = el('input', { type: 'checkbox', checked: false });
  const includeRecipe = el('input', { type: 'checkbox', checked: true });
  const feedback = el('div', { class: 'ai-suggest-feedback', role: 'status', 'aria-live': 'polite' },
    'Choose a provider, enter an API key for this page session, and describe the result you want.');
  const suggestions = el('div', { class: 'ai-suggest-results' });
  const providerCards = el('div', { class: 'ai-provider-cards' });
  const rows = {};
  const keys = {};
  const verified = {};
  const models = {};
  let generating = false;

  const message = (value, kind = '') => {
    feedback.className = 'ai-suggest-feedback' + (kind ? ' ' + kind : '');
    feedback.textContent = value;
  };
  const status = (id, value, kind = '') => {
    const row = rows[id]; if (!row) return;
    row.status.className = 'ai-connection-status' + (kind ? ' ' + kind : '');
    row.status.textContent = value;
  };
  const setModel = id => {
    const value = rows[id].model.value.trim();
    models[id] = value || AI_PROVIDERS[id].model;
    verified[id] = false;
    status(id, keys[id] ? `${maskAIKey(keys[id])} · Model changed — Connect & Test` : 'No API key in memory', 'muted');
  };

  async function check(id) {
    if (!keys[id]) { verified[id] = false; status(id, 'No API key in memory', 'muted'); return false; }
    const key = keys[id]; const model = models[id];
    verified[id] = false;
    status(id, `${maskAIKey(key)} · Checking connection…`, 'checking');
    try {
      await verifyAIConnection(id, key, model);
      // Don't stamp an old async response as valid after a key/model change.
      if (keys[id] !== key || models[id] !== model) return false;
      verified[id] = true;
      status(id, `✓ Connected · ${maskAIKey(key)} · ${model}`, 'ok');
      return true;
    } catch (e) {
      if (keys[id] !== key || models[id] !== model) return false;
      verified[id] = false;
      status(id, `⚠ ${maskAIKey(key)} · ${readableAIError(id, e)}`, 'bad');
      return false;
    }
  }

  async function storeAndTest(id) {
    const row = rows[id];
    row.save.disabled = true;
    try {
      const entered = row.key.value.trim();
      const key = entered || keys[id];
      if (!key) { status(id, 'Enter an API key first', 'bad'); return; }
      const newRecord = await saveAISetting(id, key, row.model.value.trim());
      keys[id] = newRecord.key;
      models[id] = newRecord.model;
      verified[id] = false;
      row.key.value = '';
      row.key.placeholder = maskAIKey(keys[id]) + ' (in memory; paste a new key to replace)';
      const good = await check(id);
      message(good ? `${AI_PROVIDERS[id].label} is connected and ready.` :
        `${AI_PROVIDERS[id].label} key is in memory, but the connection or model is not verified.`, good ? 'ok' : 'bad');
    } catch (e) { status(id, 'Save failed: ' + e.message, 'bad'); }
    finally { row.save.disabled = false; }
  }

  async function forgetKey(id) {
    try {
      await deleteAISetting(id);
      // In case migration of a legacy Anthropic key was previously blocked.
      if (id === 'anthropic') LS.remove('anthropicKey');
      keys[id] = ''; verified[id] = false;
      rows[id].key.value = '';
      rows[id].key.placeholder = AI_PROVIDERS[id].placeholder;
      status(id, 'Key cleared from memory', 'muted');
      message(`${AI_PROVIDERS[id].label} key cleared.`);
    } catch (e) { status(id, `Could not clear key: ${e.message}`, 'bad'); }
  }

  for (const [id, p] of Object.entries(AI_PROVIDERS)) {
    const key = el('input', { type: 'password', autocomplete: 'new-password',
      spellcheck: 'false', placeholder: p.placeholder, class: 'ai-key-input',
      'aria-label': `${p.label} API key` });
    const model = el('input', { type: 'text', value: p.model, spellcheck: 'false',
      autocomplete: 'off', class: 'ai-model-input', 'aria-label': `${p.label} model ID` });
    const connect = el('div', { class: 'ai-connection-status muted', role: 'status' }, 'Checking this page’s memory…');
    const save = el('button', { class: 'btn', type: 'button', onclick: () => storeAndTest(id) }, 'Connect & Test');
    const clear = el('button', { class: 'btn ghost', type: 'button', onclick: () => forgetKey(id) }, 'Clear');
    const card = el('section', { class: 'ai-provider-card', 'data-provider': id },
      el('div', { class: 'ai-provider-heading' }, el('b', {}, p.label),
        el('a', { href: p.help, target: '_blank', rel: 'noopener noreferrer' }, 'Get API key ↗')),
      el('div', { class: 'ai-provider-form' },
        el('label', {}, 'API key', key), el('label', {}, 'Model ID', model)),
      el('div', { class: 'ai-provider-actions' }, save, clear), connect);
    providerCards.append(card);
    rows[id] = { card, key, model, status: connect, save };
    keys[id] = ''; models[id] = p.model; verified[id] = false;
    key.addEventListener('input', () => {
      verified[id] = false;
      status(id, 'New key entered · Connect & Test to connect', 'muted');
    });
    model.addEventListener('input', () => setModel(id));
  }

  function updateActive() {
    const id = provider.value;
    LS.set('aiProvider', id); // Saves only a provider ID; never a key.
    Object.entries(rows).forEach(([rowId, row]) => row.card.classList.toggle('active', rowId === id));
    suggestions.replaceChildren();
    message(`Using ${AI_PROVIDERS[id].label}. ${verified[id] ? 'Connection is ready.' : 'Connect & Test the key to verify access.'}`);
  }
  provider.addEventListener('change', updateActive);
  const run = el('button', { class: 'btn primary', type: 'button', onclick: generate }, 'Suggest Recipe');

  async function generate() {
    if (generating) return;
    const id = provider.value; const goal = description.value.trim();
    if (!goal) { message('Describe what you want the recipe to do.', 'bad'); description.focus(); return; }
    if (rows[id].key.value.trim()) { message('You entered a new key. Click Connect & Test first.', 'bad'); return; }
    if (!keys[id]) { message(`Enter a ${AI_PROVIDERS[id].label} API key and click Connect & Test.`, 'bad'); return; }
    generating = true; run.disabled = true;
    suggestions.replaceChildren();
    try {
      if (!verified[id] && !await check(id)) {
        message('The connection is not verified. Check the provider status above.', 'bad'); return;
      }
      const before = JSON.stringify(serialRecipe());
      // Never transmit existing argument values: they may contain passwords or encryption keys.
      const existing = includeRecipe.checked
        ? serialRecipe().map(op => ({ module: op.module, disabled: op.disabled })) : [];
      const samples = [];
      if (includeSample.checked && cur().bytes.length)
        samples.push('Input: ' + decodeText(cur().bytes.subarray(0, 500), 'utf8'));
      if (includeOutput.checked && S.res && S.out.length)
        samples.push('Output: ' + decodeText(S.out.subarray(0, 500), 'utf8'));
      const sample = samples.join('\n');
      // Phase one: dynamically selected shortlist with operation names and descriptions.
      const catalogue = buildCandidateCatalogue(S.mods, goal, existing);
      message(`Stage 1/2 · ${AI_PROVIDERS[id].label} is selecting operations…`);
      const proposedNames = validateAIPlan(await requestAIText(id, keys[id], models[id],
        buildPlanningPrompt(goal, catalogue, existing, sample), 1200), catalogue);
      if (!proposedNames.length) {
        message('No suitable operations were identified. Try describing the encoding, format or task more precisely.', 'bad');
        return;
      }
      // Phase two: provide full argument specifications ONLY for selected operations.
      message(`Stage 2/2 · Configuring ${proposedNames.length} operation(s) and validating parameters…`);
      const response = await requestAIText(id, keys[id], models[id],
        buildConfigurationPrompt(goal, proposedNames, S.mods, existing, sample), 4800);
      const result = validateAIRecipe(response, proposedNames, S.mods);
      message(`Configured ${result.steps.length} operation(s) using ${AI_PROVIDERS[id].label}. Review before applying.`, 'ok');
      renderAIRecipeSuggestion(result, suggestions, before);
    } catch (e) { message(`Suggestion failed: ${readableAIError(id, e)}`, 'bad'); }
    finally { generating = false; run.disabled = false; }
  }

  const box = el('div', { class: 'ai-suggest' },
    el('div', { class: 'desc' }, 'AI suggestions are experimental. The provider receives your goal and a shortlist of HexSpindle operations, followed by exact argument specifications for chosen steps. Two API requests are used per suggestion. Results are validated locally before applying.'),
    el('label', { class: 'ai-main-label' }, 'Provider', provider),
    providerCards,
    el('div', { class: 'ai-suggest-privacy' }, 'API keys are kept only in this page’s memory and are cleared on reload or closing the tab. They are not saved to browser storage or a HexSpindle server. Malicious scripts or browser extensions could still access them while the page is open. Requests are sent directly to your chosen AI provider and may be blocked by browser CORS rules.'),
    el('label', { class: 'ai-main-label' }, 'What do you want to do?', description),
    el('label', { class: 'switch ai-sample-toggle', title: 'Share current recipe names and disabled status, but never argument values or keys' },
      includeRecipe, el('i'), el('span', {}, 'Include current recipe steps (names only; no keys or arguments)')),
    el('label', { class: 'switch ai-sample-toggle', title: 'Explicitly share up to 500 bytes of input with the selected provider' },
      includeSample, el('i'), el('span', {}, 'Include first 500 bytes of my current input (optional)')),
    el('label', { class: 'switch ai-sample-toggle', title: 'Explicitly share up to 500 bytes of output with the selected provider' },
      includeOutput, el('i'), el('span', {}, 'Include first 500 bytes of my current output (optional)')),
    feedback, suggestions);
  openModal('Suggest a recipe', box, [run]);
  updateActive();
  description.focus();

  // Do not clear current UI state while loading. Errors stay visible per provider.
  try {
    await migrateLegacyAnthropicKey();
  } catch (e) { status('anthropic', 'Could not clear legacy key storage: ' + e.message, 'bad'); }
  await Promise.all(Object.keys(AI_PROVIDERS).map(async id => {
    try {
      const record = await loadAISetting(id);
      if (!record) { status(id, 'No API key in memory', 'muted'); return; }
      keys[id] = record.key; models[id] = record.model || AI_PROVIDERS[id].model;
      rows[id].model.value = models[id];
      rows[id].key.placeholder = maskAIKey(record.key) + ' (in memory; paste a new key to replace)';
      await check(id);
    } catch (e) { status(id, 'Could not read in-memory key: ' + e.message, 'bad'); }
  }));
}
async function bakeRaw(bytes, recipe) {
  const j = await engineBake(bytes, recipe);
  if (j.error) throw new Error(j.error.message);
  return j.output;
}
async function compareOutputs() {
  if (S.inputs.length < 2) return toast('Add a second input tab first (the + next to the input tabs) to compare against', true);
  const selA = el('select', {}, S.inputs.map((inp, i) => el('option', { value: i, selected: i === S.tab }, inp.name)));
  const otherIdx = S.inputs.findIndex((_, i) => i !== S.tab);
  const selB = el('select', {}, S.inputs.map((inp, i) => el('option', { value: i, selected: i === otherIdx }, inp.name)));
  let pick;
  const picked = new Promise(res => { pick = res; });
  openModal('Compare two inputs', el('div', { class: 'card' },
    el('div', { class: 'desc' }, 'Runs the current recipe against two different input tabs and diffs the text results, line by line.'),
    el('div', { class: 'row', style: 'display:flex;gap:10px;align-items:center;margin-top:10px' }, el('span', {}, 'A:'), selA, el('span', {}, 'B:'), selB)),
    [el('button', { class: 'btn primary', onclick: () => pick([+selA.value, +selB.value]) }, 'Compare')]);
  const [ia, ib] = await picked;
  if (ia === ib) return toast('Pick two different input tabs', true);
  const nameA = S.inputs[ia].name, nameB = S.inputs[ib].name;
  openModal(`Compare: ${nameA} vs ${nameB}`, el('div', { class: 'empty' }, 'Comparing…'));
  try {
    const recipe = serialRecipe();
    const [outA, outB] = await Promise.all([bakeRaw(S.inputs[ia].bytes, recipe), bakeRaw(S.inputs[ib].bytes, recipe)]);
    const textA = new TextDecoder().decode(outA), textB = new TextDecoder().decode(outB);
    if (textA === textB) { openModal(`Compare: ${nameA} vs ${nameB}`, el('div', { class: 'empty' }, 'Identical output - no differences.')); return; }
    // Diff needs exactly two samples, so join them with a separator that cannot occur in real output.
    const SEP = '\uE000HexSpindle compare\uE000';
    const diffBytes = await bakeRaw(new TextEncoder().encode(textA + SEP + textB), [{ module: 'Diff', args: [SEP, 'Line', true, true, false, false] }]);
    const dark = document.documentElement.dataset.theme !== 'light';
    const doc = `<!doctype html><meta charset="utf-8"><style>body{margin:14px;font:13px/1.5 ui-monospace,Consolas,monospace;color:${dark ? '#d9e6ff' : '#12203a'};background:${dark ? '#0a1020' : '#fff'}}</style>` + new TextDecoder().decode(diffBytes);
    openModal(`Compare: ${nameA} vs ${nameB}`, el('iframe', { class: 'render', style: 'width:100%;height:50vh;border:0', sandbox: '', srcdoc: doc, title: 'Diff' }));
  } catch (e) { openModal(`Compare: ${nameA} vs ${nameB}`, el('div', { class: 'empty' }, 'Compare failed: ' + e.message)); }
}

// command palette
let palSel = 0, palRes = [];
function palette() {
  $('#paletteOverlay').hidden = false; const i = $('#palInput'); i.value = ''; i.focus(); palFill();
}
function palFill() {
  const q = $('#palInput').value; palRes = q.trim() ? searchOps(q).slice(0, 40) : [...S.fav].filter(n => S.mods[n]).slice(0, 40); palSel = 0; palDraw();
}
function palDraw() {
  $('#palList').replaceChildren(...palRes.map((n, i) => el('div', { class: 'pal-item' + (i === palSel ? ' on' : ''), onmouseenter: () => { palSel = i; $$('.pal-item').forEach((x, j) => x.classList.toggle('on', j === i)); }, onclick: () => palPick(n) },
    el('span', { style: `width:8px;height:8px;border-radius:50%;background:hsl(${hue(n)} 90% 60%)` }), el('b', {}, n), el('span', { class: 'desc' }, S.mods[n].desc), el('small', {}, S.mods[n].categoryLabel))));
  $('#palList').children[palSel]?.scrollIntoView({ block: 'nearest' });
}
function palPick(n) { closeModal(); addOp(n); }

// ---------------------------------------------------------------- splitters, background, theme
function split(id, onMove) {
  const s = $(id); s.addEventListener('pointerdown', e => {
    e.preventDefault(); s.setPointerCapture(e.pointerId); s.classList.add('drag');
    const mv = ev => onMove(ev), up = () => { s.classList.remove('drag'); s.removeEventListener('pointermove', mv); s.removeEventListener('pointerup', up); LS.set('layout', { c1: getComputedStyle(document.documentElement).getPropertyValue('--c1'), c2: getComputedStyle(document.documentElement).getPropertyValue('--c2') }); };
    s.addEventListener('pointermove', mv); s.addEventListener('pointerup', up);
  });
}
function initSplits() {
  const root = document.documentElement.style, main = $('#main');
  split('#split1', e => root.setProperty('--c1', Math.max(200, Math.min(560, e.clientX - main.getBoundingClientRect().left - 10)) + 'px'));
  split('#split2', e => { const c1 = parseInt(getComputedStyle(document.documentElement).getPropertyValue('--c1')) || 290; root.setProperty('--c2', Math.max(260, Math.min(700, e.clientX - main.getBoundingClientRect().left - 10 - c1 - 6)) + 'px'); });
  split('#split3', e => { const r = $('#ioPane').getBoundingClientRect(); const f = Math.max(.15, Math.min(.85, (e.clientY - r.top) / r.height)); root.setProperty('--r1', f * 2); root.setProperty('--r2', (1 - f) * 2); });
  const l = LS.get('layout'); if (l?.c1?.trim()) { root.setProperty('--c1', l.c1.trim()); root.setProperty('--c2', l.c2.trim()); }
}
function initBackground() {
  const c = $('#bg'), g = c.getContext('2d'); let w, h, t = 0; const pts = Array.from({ length: 46 }, () => ({ x: Math.random(), y: Math.random(), v: .00005 + Math.random() * .00012, s: 1 + Math.random() * 1.6 }));
  const rs = () => { w = c.width = innerWidth; h = c.height = innerHeight; }; rs(); addEventListener('resize', rs);
  const still = matchMedia('(prefers-reduced-motion: reduce)').matches;
  function frame() {
    if (document.hidden) return requestAnimationFrame(frame);
    const rgb = getComputedStyle(document.documentElement).getPropertyValue('--accent-rgb'); g.clearRect(0, 0, w, h); t += .35;
    g.strokeStyle = `rgba(${rgb},.07)`; g.lineWidth = 1; const gs = 56, off = t % gs;
    g.beginPath(); for (let x = -gs + off; x < w; x += gs) { g.moveTo(x, 0); g.lineTo(x, h); } for (let y = -gs + off; y < h; y += gs) { g.moveTo(0, y); g.lineTo(w, y); } g.stroke();
    g.fillStyle = `rgba(${rgb},.5)`; for (const p of pts) { p.y -= p.v * 16; if (p.y < 0) { p.y = 1; p.x = Math.random(); } g.beginPath(); g.arc(p.x * w, p.y * h, p.s, 0, 7); g.fill(); }
    if (!still) requestAnimationFrame(frame);
  }
  frame();
}
function setTheme(t) { document.documentElement.dataset.theme = t; LS.set('theme', t); $('#btnTheme').firstChild.innerHTML = `<svg viewBox="0 0 24 24">${ICONS[t === 'dark' ? 'sun' : 'moon']}</svg>`; if (S.res) renderOutput(); }
function setAccent(a) { document.documentElement.dataset.accent = a; LS.set('accent', a); $$('#accents i').forEach(i => i.classList.toggle('on', i.dataset.a === a)); }

// ---------------------------------------------------------------- feature chrome
function ensureIntelChrome() {
  // Intel/parallel UI styles now live in app.css. Do not load a second stylesheet.
  const undoBtn = $('#btnUndo');
  if (undoBtn && !$('#btnRedo')) {
    const redoBtn = el('button', { class: 'icon-btn', id: 'btnRedo', title: 'Redo (Ctrl+Shift+Z / Ctrl+Y)', disabled: true }, icon('redo'));
    undoBtn.after(redoBtn);
  }
  const bakeBtn = $('#btnBake');
  if (bakeBtn && !$('#btnCancelBake')) {
    const cancelBtn = el('button', { class: 'btn cancel-bake', id: 'btnCancelBake', title: 'Cancel the current recipe run', disabled: true }, icon('x'), 'Cancel');
    bakeBtn.before(cancelBtn);
    setCancelEnabled(false);
  }
}

// ---------------------------------------------------------------- init
const CATEGORY_ORDER = ['data_format', 'encryption_encoding', 'public_key', 'arithmetic_logic', 'networking', 'language', 'utils', 'date_time',
  'extractors', 'compression', 'hashing', 'code_tidy', 'forensics', 'multimedia', 'other', 'flow_control'];
function localCatalogue() {
  const byCat = {};
  for (const m of Object.values(MODULES)) (byCat[m.category] ??= []).push(m.name);
  const ordered = [...CATEGORY_ORDER.filter(c => c in byCat), ...Object.keys(byCat).filter(c => !CATEGORY_ORDER.includes(c)).sort()];
  return {
    categories: ordered.map(c => ({ id: c, label: CATEGORY_LABELS[c] || c, modules: [...byCat[c]].sort((a, b) => a.localeCompare(b)) })),
    modules: Object.fromEntries(Object.entries(MODULES).map(([n, m]) => [n, describe(m)])),
  };
}
async function init() {
  const overlay = el('div', { id: 'outHighlights', class: 'out-highlights', 'aria-hidden': 'true' });
  overlay.hidden = true;
  $('#output').before(overlay);
  ensureIntelChrome();
  hydrateIcons(); setTheme(LS.get('theme', 'dark')); setAccent(LS.get('accent', 'cyan')); initSplits(); initBackground(); wireRecipeDnD(); wireOpsPaneDnD();
  const cat = localCatalogue();
  S.mods = cat.modules; S.cats = cat.categories; $('#opCount').textContent = `${Object.keys(S.mods).length} ops`;
  renderOps();

  // Restore only within this browser tab. New tabs start clean, except for a
  // deliberately opened share link; refreshing keeps the in-progress workspace.
  // Fresh navigations, including duplicated tabs with copied sessionStorage,
  // begin clean. Only reload/back-forward of this tab can reuse a snapshot.
  try {
    if (performance.getEntriesByType('navigation')[0]?.type === 'navigate')
      sessionStorage.removeItem(WORKSPACE_KEY);
  } catch { /* storage may be unavailable */ }
  const restored = restoreWorkspace();
  if (!restored) {
    const h = new URLSearchParams(location.hash.slice(1));
    try {
      if (h.get('r')) loadRecipe(JSON.parse(urlu8(h.get('r'))), true);
      if (h.get('i')) { cur().bytes = b64dec(h.get('i').replace(/-/g, '+').replace(/_/g, '/')); cur().big = cur().bytes.length > (1 << 20); }
    } catch (e) { toast('Could not restore the shared recipe', true); }
  }
  renderRecipe(); hist.push(); renderInput(); $('#autoBake').checked = S.auto;
  if (restoredViewState) {
    const saved = restoredViewState;
    if ([...$('#outView').options].some(o => o.value === saved.outView)) $('#outView').value = saved.outView;
    $('#findbar').hidden = !saved.find?.open;
    $('#findInput').value = saved.find?.term || '';
    $('#findRegex').checked = !!saved.find?.regex;
    if (S.res) {
      paintSteps(); renderOutput();
      $('#outTime').textContent = `${S.res.ms ?? 0} ms`;
      $('#statusRight').textContent = `IN ${fmtBytes(cur().bytes.length)} → OUT ${fmtBytes(S.out.length)} · restored`;
      if (saved.find?.open) findRun();
    }
    requestAnimationFrame(() => {
      $('#input').scrollTop = saved.scroll?.input || 0;
      $('#output').scrollTop = saved.scroll?.output || 0;
      $('#recipeList').scrollTop = saved.scroll?.recipe || 0;
      syncOutputHighlights();
    });
  }

  // wiring
  $('#opSearch').addEventListener('input', debounce(renderOps, 80));
  $('#opSearch').addEventListener('keydown', e => { if (e.key === 'Enter') { const r = searchOps($('#opSearch').value); if (r[0]) { addOp(r[0]); } } if (e.key === 'Escape') { e.target.value = ''; renderOps(); } });
  $('#input').addEventListener('input', e => { const inp = cur(); try { inp.bytes = encodeText(inp.enc === 'utf8' || inp.enc === 'latin1' ? updatedInputText(inp, e.target.value) : e.target.value, inp.enc); e.target.style.outline = ''; } catch { e.target.style.outline = '1px solid var(--err)'; return; } inputStats(); S.inspect = null; persist(); scheduleBake(); });
  $('#inEnc').addEventListener('change', e => { cur().enc = e.target.value; renderInput(); persist(); });
  $('#outView').addEventListener('change', () => { S.viewLimit = VIEW_STEP; renderOutput(); persist(); });
  $('#btnWrap').onclick = $('#btnWrapIn').onclick = () => { S.wrap = !S.wrap; LS.set('wrap', S.wrap); applyWrap(); };
  $$('#mtabs button').forEach(b => b.onclick = () => setPane(b.dataset.p));
  setPane(LS.get('pane', 'recipe')); applyWrap();
  addEventListener('resize', () => setPane(document.body.dataset.pane));
  $('#btnBake').onclick = () => { S.stepTo = null; S.inspect = null; stepParallelCache = new Map(); if (narrow()) setPane('io'); bake(); };
  $('#btnCancelBake').onclick = () => cancelBake(false);
  $('#btnStep').onclick = () => { if (narrow()) setPane('io'); step(); };
  $('#autoBake').onchange = e => { S.auto = e.target.checked; persist(); if (S.auto) scheduleBake(true); };
  $('#btnClearRecipe').onclick = () => { S.recipe = []; S.stepTo = S.inspect = null; commit(); };
  $('#btnUndo').onclick = undo; if ($('#btnRedo')) $('#btnRedo').onclick = redo;
  $('#btnClearIn').onclick = () => setInputBytes(new Uint8Array(0));
  $('#btnPaste').onclick = async () => { try { setInputBytes(new TextEncoder().encode(await navigator.clipboard.readText())); } catch { toast('Clipboard access was denied - paste with Ctrl+V instead', true); } };
  $('#btnOpen').onclick = () => $('#fileInput').click(); $('#fileInput').onchange = e => { loadFiles(e.target.files); e.target.value = ''; };
  $('#btnCopy').onclick = async () => { try { await navigator.clipboard.writeText(decodeText(S.out, $('#outView').value === 'latin1' ? 'latin1' : 'utf8')); toast('Output copied'); } catch { $('#output').select(); document.execCommand('copy'); toast('Output copied'); } };
  $('#btnSave').onclick = () => { const img = sniffImage(S.out); download(img ? 'output.' + img.split('/')[1].replace('svg+xml', 'svg').replace('x-icon', 'ico') : 'output.bin', S.out); };
  $('#btnSwap').onclick = () => { setInputBytes(S.out.slice(), null, cur().enc === 'hex' ? 'utf8' : cur().enc); };
  $('#btnMagic').onclick = magic; $('#btnCompare').onclick = compareOutputs; $('#btnPalette').onclick = palette; $('#btnExamples').onclick = examples; $('#btnSuggest').onclick = suggestRecipe; $('#btnSuggest').title = 'Suggest a configured recipe using Anthropic (Claude) or OpenAI (ChatGPT) and your own API key'; $('#btnRecipeIO').onclick = recipeIO; $('#btnHelp').onclick = help;
  $('#btnBatch').onclick = batchOpen; $('#batchInput').onchange = e => { runBatch(e.target.files); e.target.value = ''; };
  $('#btnExpandAll').onclick = expandAllCats; $('#btnCollapseAll').onclick = collapseAllCats;
  $('#output').addEventListener('scroll', syncOutputHighlights);
  $('#output').addEventListener('copy', e => {
    const ta = e.currentTarget, from = ta.selectionStart, to = ta.selectionEnd;
    if (to <= from || !e.clipboardData) return;
    e.clipboardData.setData('text/plain', (S.outputRawText || '').slice(from, to));
    e.preventDefault();
  });
  $('#input').addEventListener('copy', e => {
    const ta = e.currentTarget, from = ta.selectionStart, to = ta.selectionEnd;
    if (to <= from || !e.clipboardData) return;
    const inp = cur(), raw = inp._rawText;
    const selected = (inp.enc === 'latin1' || inp.enc === 'utf8') && raw !== undefined
      ? raw.slice(from, to) : ta.value.slice(from, to);
    e.clipboardData.setData('text/plain', selected);
    e.preventDefault();
  });
  $('#btnFind').onclick = findOpen; $('#findClose').onclick = findClose; $('#findInput').addEventListener('input', debounce(findRun, 120));
  $('#findNext').onclick = () => { findGo(1); $('#findInput').focus({ preventScroll: true }); }; $('#findPrev').onclick = () => { findGo(-1); $('#findInput').focus({ preventScroll: true }); }; $('#findRegex').onchange = findRun;
  $('#findInput').addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); findGo(e.shiftKey ? -1 : 1); } if (e.key === 'Escape') findClose(); });
  $('#btnTheme').onclick = () => setTheme(document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark');
  $$('#accents i').forEach(i => i.onclick = () => setAccent(i.dataset.a));
  $('#overlay').addEventListener('mousedown', e => { if (e.target.id === 'overlay') closeModal(); }); $('#paletteOverlay').addEventListener('mousedown', e => { if (e.target.id === 'paletteOverlay') closeModal(); });
  $('#palInput').addEventListener('input', palFill);
  $('#palInput').addEventListener('keydown', e => {
    if (e.key === 'ArrowDown') { palSel = Math.min(palSel + 1, palRes.length - 1); palDraw(); e.preventDefault(); } else if (e.key === 'ArrowUp') { palSel = Math.max(0, palSel - 1); palDraw(); e.preventDefault(); } else if (e.key === 'Enter' && palRes[palSel]) palPick(palRes[palSel]);
  });
  addEventListener('keydown', e => {
    const mod = e.ctrlKey || e.metaKey;
    if (e.key === 'Escape') closeModal();
    else if (mod && e.key === 'Enter') { e.preventDefault(); S.stepTo = S.inspect = null; stepParallelCache = new Map(); bake(); }
    else if (mod && e.key.toLowerCase() === 'k') { e.preventDefault(); palette(); }
    else if (mod && e.key.toLowerCase() === 's') { e.preventDefault(); recipeIO(); }
    else if (mod && e.key.toLowerCase() === 'f' && !/INPUT|TEXTAREA/.test(document.activeElement?.tagName)) { e.preventDefault(); findOpen(); }
    else if (mod && e.key.toLowerCase() === 'z' && $('#recipePane').contains(document.activeElement) && !/INPUT|TEXTAREA/.test(document.activeElement.tagName)) { e.preventDefault(); e.shiftKey ? redo() : undo(); }
    else if (mod && e.key.toLowerCase() === 'y' && $('#recipePane').contains(document.activeElement) && !/INPUT|TEXTAREA/.test(document.activeElement.tagName)) { e.preventDefault(); redo(); }
  });
  addEventListener('paste', e => {
    const tag = document.activeElement?.tagName; if (/INPUT|TEXTAREA|SELECT/.test(tag)) return;
    const text = e.clipboardData?.getData('text'); if (!text) return; e.preventDefault();
    const box = $('#overlay').hidden ? null : $('#modal textarea:not([readonly])');
    if (box) { box.value = text; box.focus(); } else setInputBytes(encodeText(text, 'utf8'), null, 'utf8');
  });
  // drag & drop files anywhere onto the input pane
  const inPane = $('#inPane'); ['dragenter', 'dragover'].forEach(t => addEventListener(t, e => { if ([...(e.dataTransfer?.types || [])].includes('Files')) { e.preventDefault(); inPane.classList.add('dragging'); } }));
  ['dragleave', 'drop'].forEach(t => addEventListener(t, e => { if (t === 'drop' || e.target === document.documentElement || !e.relatedTarget) inPane.classList.remove('dragging'); }));
  addEventListener('drop', e => { if (e.dataTransfer?.files?.length) { e.preventDefault(); loadFiles(e.dataTransfer.files); } });

  // Flush pending edits before reload; debounce handles normal keystrokes.
  addEventListener('pagehide', saveWorkspace);
  setStatus('', `Ready · ${Object.keys(S.mods).length} operations`);
  if (!restored || !S.res || S.outputTab !== S.tab || (S.auto && S.outputDirty)) scheduleBake(true);
  persist();
}
init();
