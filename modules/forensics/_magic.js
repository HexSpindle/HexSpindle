// Magic hints for forensic parsers and analysers. These report on an artifact instead of decoding it,
// so Magic lists them as suggested analysis for data it recognises; it never runs them itself.
import { analyses, decodes, count } from '../../core/magic-detect.js';
import { decodeLatin1 } from '../../core/util.js';

// Strings inside a binary (table names in a SQLite file, entry names in a ZIP) tell related artifacts apart.
const SCAN = 1 << 20;
const scanCache = new WeakMap();
const body = bytes => { if (!scanCache.has(bytes)) scanCache.set(bytes, decodeLatin1(bytes.subarray(0, SCAN))); return scanCache.get(bytes); };
const each = (names, detect) => names.forEach(name => analyses(name, detect));

// ---- Executables -------------------------------------------------------------------------------

const isPE = ({ bytes, at }) => {
  if (!at('MZ') || bytes.length < 0x40) return false;
  const header = bytes[0x3c] | (bytes[0x3d] << 8) | (bytes[0x3e] << 16);
  return at('PE\0\0', header);
};
each(['Parse PE Header', 'PE Section Analyzer'], ctx => isPE(ctx) ? 0.95 : null);
each(['PE Rich Header Parser', 'PE Resource Inspector', 'PE Authenticode Inspector', 'PE CLR Managed Detector'], ctx => isPE(ctx) ? 0.7 : null);
each(['.NET Assembly Metadata Parser', '.NET User String Extractor'], ctx => isPE(ctx) && /mscoree\.dll|_CorExeMain|_CorDllMain/.test(body(ctx.bytes)) ? 0.9 : null);

analyses('Parse ELF Header', ({ at }) => at('\x7fELF') ? 0.95 : null);
each(['ELF Symbol and Relocation Parser', 'ELF Notes and Build-ID Extractor'], ({ at }) => at('\x7fELF') ? 0.7 : null);

const isMachO = ({ at }) => at('\xcf\xfa\xed\xfe') || at('\xce\xfa\xed\xfe') || at('\xfe\xed\xfa\xcf') || at('\xfe\xed\xfa\xce') || at('\xca\xfe\xba\xbe');
analyses('Mach-O Header Parser', ctx => isMachO(ctx) ? 0.9 : null);
analyses('Mach-O Code Signature Inspector', ctx => isMachO(ctx) ? 0.7 : null);
analyses('DEX Metadata Parser', ({ at }) => at('dex\n') ? 0.95 : null);

const isZip = ({ at }) => at('PK\x03\x04');
analyses('Android APK Manifest Analyzer', ctx => isZip(ctx) && body(ctx.bytes).includes('AndroidManifest.xml') ? 0.9 : null);
analyses('Java JAR Metadata Analyzer', ctx => isZip(ctx) && body(ctx.bytes).includes('META-INF/MANIFEST.MF') ? 0.9 : null);

// ---- Windows artifacts ---------------------------------------------------------------------------

// A registry hive records its own file name (UTF-16LE at offset 0x30), which says what it can contain.
const hiveName = ({ bytes, at }) => {
  if (!at('regf') || bytes.length < 0x70) return null;
  let name = '';
  for (let i = 0x30; i + 1 < 0x70; i += 2) { const c = bytes[i] | (bytes[i + 1] << 8); if (!c) break; name += String.fromCharCode(c); }
  return name.toLowerCase();
};
const hive = (pattern, fit = 0.85) => ctx => { const name = hiveName(ctx); return name === null ? null : pattern.test(name) ? fit : name ? null : 0.45; };
analyses('Windows Registry Hive Inspector', ctx => hiveName(ctx) === null ? null : 0.95);
each(['ShimCache Parser', 'BAM/DAM Parser', 'Windows Services Registry Analyzer'], hive(/system/));
each(['UserAssist Decoder', 'RecentDocs Analyzer', 'OpenSave MRU Analyzer'], hive(/ntuser/));
analyses('Run Key Analyzer', hive(/ntuser|software/));
analyses('ShellBags Parser', hive(/usrclass|ntuser/));
analyses('Amcache Parser', hive(/amcache/));

// Raw event logs are converted first; the analysers below read the converted XML or JSON.
decodes('EVTX to JSON', ({ at }) => at('ElfFile\0') ? { fit: 0.95, trust: 0.9 } : null);
analyses('EVTX to XML', ({ at }) => at('ElfFile\0') ? 0.8 : null);
analyses('Windows EVTX Metadata Inspector', ({ at }) => at('ElfFile\0') ? 0.9 : null);

const eventIds = ({ isText, head, bytes }) => {
  if (!isText || !/<Event[\s>]|"EventI[Dd]"|"Id"\s*:/.test(head)) return null;
  const text = body(bytes), ids = new Set();
  for (const m of text.matchAll(/<EventID[^>]*>(\d+)<\/EventID>|"EventI[Dd]"\s*:\s*"?(\d+)/g)) ids.add(+(m[1] || m[2]));
  return ids.size ? { ids, text } : null;
};
const events = (wanted, provider = null, fit = 0.85) => ctx => {
  const found = eventIds(ctx);
  if (!found || (provider && !provider.test(found.text))) return null;
  return wanted.some(id => found.ids.has(id)) ? fit : null;
};
each(['Windows Event ID Explainer', 'Windows Event Log Summary'], ctx => eventIds(ctx) ? 0.8 : null);
analyses('Windows Logon Analyzer', events([4624, 4625, 4634, 4647, 4648, 4672]));
analyses('Kerberos Event Analyzer', events([4768, 4769, 4770, 4771, 4776]));
analyses('PowerShell Script Block Analyzer', events([4103, 4104]));
analyses('RDP Activity Analyzer', events([21, 22, 23, 24, 25, 1149, 4778, 4779], /TerminalServices|RemoteDesktop|RemoteConnection|4778|4779/));
analyses('Windows Service Installation Detector', events([7045, 4697]));
analyses('Windows Event Log Integrity Analyzer', events([1102, 104, 4719]));
analyses('Windows Scheduled Task Event Analyzer', events([106, 140, 141, 200, 201, 4698, 4699, 4700, 4701, 4702]));
analyses('Sysmon Persistence Event Analyzer', events([12, 13, 14, 19, 20, 21], /Sysmon/));
analyses('Windows SMB Share Event Analyzer', events([5140, 5142, 5143, 5144, 5145]));
analyses('Defender Event Log Analyzer', events([1006, 1007, 1008, 1116, 1117, 1118, 1119, 5001, 5007], /Defender/));

analyses('Windows LNK Parser', ({ at }) => at('L\0\0\0\x01\x14\x02\0') ? 0.95 : null);
analyses('Windows Prefetch Parser', ({ at }) => at('SCCA', 4) || at('MAM\x04') ? 0.95 : null);
analyses('NTFS MFT Parser', ({ at }) => at('FILE0') || at('FILE*') ? 0.9 : null);
each(['NTFS Attribute Inspector', 'NTFS Alternate Data Streams Analyzer'], ({ at, bytes }) => (at('FILE0') || at('FILE*')) && bytes.length <= 4096 ? 0.8 : null);
analyses('Windows Recycle Bin Parser', ({ bytes, isText }) => !isText && bytes.length >= 28 && bytes.length <= 1024 && (bytes[0] === 1 || bytes[0] === 2) && bytes.subarray(1, 8).every(b => b === 0) ? 0.6 : null);
analyses('Zone.Identifier ADS Parser', ({ isText, head }) => isText && /^\[ZoneTransfer\]/m.test(head) ? 0.97 : null);
analyses('Scheduled Task XML Parser', ({ isText, head }) => isText && /<Task\b[^>]*schemas\.microsoft\.com\/windows\/2004\/02\/mit\/task/.test(head) ? 0.95 : null);

// ---- SQLite databases ----------------------------------------------------------------------------

const sqlite = (pattern, fit = 0.9) => ctx => ctx.at('SQLite format 3\0') && pattern.test(body(ctx.bytes)) ? fit : null;
analyses('Firefox History Parser', sqlite(/moz_places/));
each(['Chrome History Parser', 'Chromium Downloads Parser'], sqlite(/downloads_url_chains|keyword_search_terms/));
analyses('Browser Cookies Metadata Parser', sqlite(/moz_cookies|CREATE TABLE cookies|host_key/));
analyses('Windows Timeline ActivitiesCache Parser', sqlite(/ActivityOperation|Activity_PackageId/));

// ---- Logs and structured exports -------------------------------------------------------------------

const text = (pattern, fit) => ({ isText, head }) => isText && pattern.test(head) ? fit : null;
analyses('Apache/Nginx Access Log Analyzer', text(/^\S+ \S+ \S+ \[\d{2}\/[A-Za-z]{3}\/\d{4}:\d{2}:\d{2}:\d{2} [+-]\d{4}\] "/m, 0.9));
analyses('IIS Log Parser', text(/^#Software: Microsoft Internet Information Services|^#Fields: .*\bcs-method\b/m, 0.95));
analyses('Linux Auditd Parser', text(/^type=[A-Z_]+ msg=audit\(\d+\.\d+:\d+\)/m, 0.95));
analyses('Linux Auth Log Analyzer', text(/\bsshd\[\d+\]: |pam_unix\(|\bsudo: +\S+ : /, 0.85));
analyses('AWS CloudTrail Analyzer', text(/"eventSource"\s*:\s*"[\w.-]+\.amazonaws\.com"/, 0.95));
analyses('Microsoft 365 Audit Log Analyzer', ({ isText, head }) => isText && /"?Workload"?/.test(head) && /"?RecordType"?/.test(head) && /"?Operation"?/.test(head) ? 0.85 : null);
analyses('macOS Unified Log JSON Analyzer', text(/"eventMessage"\s*:|"processImagePath"\s*:/, 0.9));
analyses('Chromium Extension Manifest Analyzer', text(/"manifest_version"\s*:\s*\d/, 0.9));
analyses('Chromium Preferences Analyzer', ({ isText, head }) => isText && /^\s*\{/.test(head) && /"profile"\s*:\s*\{/.test(head) && /"(?:extensions|browser|session)"\s*:\s*\{/.test(head) ? 0.7 : null);
analyses('Firefox Extensions Analyzer', ({ isText, head }) => isText && /"addons"\s*:\s*\[/.test(head) && /"schemaVersion"\s*:/.test(head) ? 0.9 : null);

// ---- Scripts and indicators ----------------------------------------------------------------------

const SCRIPT = /\b(?:powershell|pwsh)\b|\bIEX\b|Invoke-(?:Expression|WebRequest|Command|Mimikatz)|FromBase64String|DownloadString|WScript\.Shell|CreateObject\(|\beval\s*\(|document\.write\(|cmd(?:\.exe)? \/c|\bcertutil\b|\bmshta\b|\brundll32\b|<script\b/i;
each(['Suspicious Script Analyzer', 'Embedded Configuration Extractor'], text(SCRIPT, 0.7));
analyses('IOC Extractor with Context', ({ isText, head }) => isText && /\s/.test(head) && count(head, /\bhttps?:\/\/|\b\d{1,3}(?:\.\d{1,3}){3}\b|\b[a-f0-9]{32,64}\b|CVE-\d{4}-\d+/gi) >= 3 ? 0.55 : null);

// ---- Media and embedded content --------------------------------------------------------------------

analyses('Extract EXIF', ({ at }) => at('\xff\xd8\xff') ? 0.8 : null);
analyses('Scan for Embedded Files', ({ isText, file, bytes }) => !isText && !file && bytes.length >= 2048 ? 0.4 : null);
