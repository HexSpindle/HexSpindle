// SPDX-License-Identifier: MIT
// Per-operation evidence acquisition, input-format and parser-scope guidance.
export const FORENSICS_EVIDENCE_GUIDE = {
  "Amcache Parser": {
    "input": "Raw Amcache.hve registry hive (regf)",
    "source": "C:\\Windows\\AppCompat\\Programs\\Amcache.hve",
    "acquire": "Collect the raw hive and matching .LOG1/.LOG2 transaction logs using KAPE RegistryHives, FTK Imager, or a forensic image; the current parser reads only the supplied base hive (no transaction-log replay)",
    "note": "Does not replay transaction logs; key schema differs by Windows version. Amcache entries are not definitive proof of execution."
  },
  "Android APK Manifest Analyzer": {
    "input": "Raw APK ZIP",
    "source": "Device-installed app or downloaded APK",
    "acquire": "adb shell pm path <package>; adb pull <apk path>; verify using aapt/aapt2",
    "note": "Binary AndroidManifest.xml differs from plain-text XML."
  },
  "Apache/Nginx Access Log Analyzer": {
    "input": "Text access.log combined/common format",
    "source": "/var/log/apache2/access.log, /var/log/httpd/access_log, /var/log/nginx/access.log",
    "acquire": "Copy log or journal export from server",
    "note": "Custom LogFormat may not parse correctly."
  },
  "AWS CloudTrail Analyzer": {
    "input": "CloudTrail Records JSON or JSONL",
    "source": "CloudTrail S3 log delivery or CloudTrail Lake export",
    "acquire": "AWS CLI aws s3 cp / CloudTrail download; preserve account/region",
    "note": "CloudTrail JSON commonly has an outer Records array."
  },
  "Azure/Entra Sign-in Log Analyzer": {
    "input": "Entra sign-in JSON export",
    "source": "Microsoft Entra admin center > Monitoring > Sign-in logs",
    "acquire": "Export JSON from portal or Microsoft Graph auditLogs/signIns",
    "note": "Sign-in visibility and retention depend on tenant/licensing."
  },
  "BAM/DAM Parser": {
    "input": "Raw SYSTEM registry hive (regf)",
    "source": "C:\\Windows\\System32\\config\\SYSTEM: ControlSet00x\\Services\\bam\\State\\UserSettings\\<SID>",
    "acquire": "Collect the raw hive and matching .LOG1/.LOG2 transaction logs using KAPE RegistryHives, FTK Imager, or a forensic image; the current parser reads only the supplied base hive (no transaction-log replay)",
    "note": "Reads BAM/DAM named values; empty results can reflect absent data or version differences. Prefer not to claim direct proof of execution without corroboration."
  },
  "Browser Cookies Metadata Parser": {
    "input": "Raw SQLite Cookies (Chromium) or cookies.sqlite (Firefox), base database file",
    "source": "Chrome/Edge: C:\\Users\\<user>\\AppData\\Local\\<vendor>\\<browser>\\User Data\\<profile>\\Network\\Cookies; Firefox: %APPDATA%\\Mozilla\\Firefox\\Profiles\\<profile>\\cookies.sqlite",
    "acquire": "Collect profile database and WAL/SHM with KAPE, FTK Imager or snapshot; checkpoint only a COPY before importing",
    "note": "Native SQLite reader, but no WAL replay: copy database together with -wal/-shm and make a safe checkpointed working copy before import. Browser/profile versions differ; no encrypted cookie decryption."
  },
  "Chi Square": {
    "input": "Arbitrary raw file bytes",
    "source": "Any captured file, recovered payload or memory extraction",
    "acquire": "Open file from HexSpindle input pane",
    "note": "Heuristics vary by data type; report offsets from original evidence."
  },
  "Chrome History Parser": {
    "input": "Raw Chromium History SQLite database",
    "source": "Chrome: %LOCALAPPDATA%\\Google\\Chrome\\User Data\\<profile>\\History; Edge: %LOCALAPPDATA%\\Microsoft\\Edge\\User Data\\<profile>\\History",
    "acquire": "Collect History and any -wal/-shm; merge/checkpoint working copy before import",
    "note": "Native SQLite reader, but no WAL replay: copy database together with -wal/-shm and make a safe checkpointed working copy before import. Browser/profile versions differ; no encrypted cookie decryption."
  },
  "Chromium Downloads Parser": {
    "input": "Raw Chromium History SQLite database, not downloaded-file bytes",
    "source": "Chrome: %LOCALAPPDATA%\\Google\\Chrome\\User Data\\<profile>\\History; Edge: %LOCALAPPDATA%\\Microsoft\\Edge\\User Data\\<profile>\\History",
    "acquire": "Collect History and any -wal/-shm; merge/checkpoint working copy before import",
    "note": "Native SQLite reader, but no WAL replay: copy database together with -wal/-shm and make a safe checkpointed working copy before import. Browser/profile versions differ; no encrypted cookie decryption."
  },
  "Chromium Extension Manifest Analyzer": {
    "input": "Unpacked extension manifest.json",
    "source": "Chrome/Edge profile Extensions\\<id>\\<version>\\manifest.json",
    "acquire": "Copy manifest.json from installed extension directory",
    "note": "Permissions are indicators, not proof of malicious behavior."
  },
  "Chromium Preferences Analyzer": {
    "input": "Chrome/Edge Preferences JSON file",
    "source": "Chromium profile: Default\\Preferences",
    "acquire": "KAPE or copy from browser profile",
    "note": "Sensitive profile preferences should be processed offline."
  },
  "Defender Event Log Analyzer": {
    "input": "Exported Event XML (<Event>...), or event JSON array/JSONL; raw binary .evtx is NOT decoded",
    "source": "%SystemRoot%\\System32\\winevt\\Logs\\Microsoft-Windows-Windows Defender%4Operational.evtx",
    "acquire": "Collect the .evtx binary for chain of custody; for this analyzer, export individual XML events using Get-WinEvent -Path <file.evtx> | ForEach-Object { $_.ToXml() }; alternatively use evtx_dump/EvtxECmd then normalize output schema. Relevant channel: Microsoft-Windows-Windows Defender/Operational",
    "note": "Known IDs: 1116/1117/5007. Current analyzer requires decoded events (XML/JSON), and explicitly rejects raw EVTX rather than silently returning empty results. Multi-Event XML and JSON schemas vary by exporter."
  },
  "Detect File Type": {
    "input": "Arbitrary raw file bytes",
    "source": "Any captured file, recovered payload or memory extraction",
    "acquire": "Open file from HexSpindle input pane",
    "note": "Heuristics vary by data type; report offsets from original evidence."
  },
  "DEX Metadata Parser": {
    "input": "Raw classes.dex",
    "source": "APK classes.dex or Android runtime app",
    "acquire": "unzip -p sample.apk classes.dex > classes.dex; JADX to cross-check",
    "note": "Import DEX bytes, not the parent APK."
  },
  "ELF Notes and Build-ID Extractor": {
    "input": "Raw ELF binary (.so, executable, .o)",
    "source": "Linux /bin, /usr/bin, /usr/lib, containers or disk image",
    "acquire": "Copy with evidence provenance; compare readelf -h -S -s -r -n",
    "note": "For stripped binaries, many symbol tables will be absent."
  },
  "ELF Symbol and Relocation Parser": {
    "input": "Raw ELF binary (.so, executable, .o)",
    "source": "Linux /bin, /usr/bin, /usr/lib, containers or disk image",
    "acquire": "Copy with evidence provenance; compare readelf -h -S -s -r -n",
    "note": "For stripped binaries, many symbol tables will be absent."
  },
  "Embed LSB": {
    "input": "Carrier image or binary input",
    "source": "Captured images or arbitrary binary carrier",
    "acquire": "Acquire original image file; choose raw/image mode as applicable",
    "note": "Embedding changes content; always work on a copy."
  },
  "Embedded Configuration Extractor": {
    "input": "Script source or raw sample bytes",
    "source": "PowerShell scripts, WSH scripts, JavaScript attachments, extracted malware",
    "acquire": "Export .ps1/.js/.vbs or carved sample; preserve hashes",
    "note": "Heuristic analysis, not evidence of execution or maliciousness."
  },
  "Entropy": {
    "input": "Arbitrary raw file bytes",
    "source": "Any captured file, recovered payload or memory extraction",
    "acquire": "Open file from HexSpindle input pane",
    "note": "Heuristics vary by data type; report offsets from original evidence."
  },
  "Extract EXIF": {
    "input": "JPEG with EXIF tags",
    "source": "Captured JPEG image",
    "acquire": "Acquire original JPEG unmodified",
    "note": "Removing EXIF is a transformation, not a forensic evidence-preservation action."
  },
  "Extract Files": {
    "input": "Arbitrary raw file bytes",
    "source": "Any captured file, recovered payload or memory extraction",
    "acquire": "Open file from HexSpindle input pane",
    "note": "Heuristics vary by data type; report offsets from original evidence."
  },
  "Extract LSB": {
    "input": "Carrier image or binary input",
    "source": "Captured images or arbitrary binary carrier",
    "acquire": "Acquire original image file; choose raw/image mode as applicable",
    "note": "Embedding changes content; always work on a copy."
  },
  "Firefox Extensions Analyzer": {
    "input": "Firefox profile extensions.json (JSON metadata file)",
    "source": "%APPDATA%\\Mozilla\\Firefox\\Profiles\\<profile>\\extensions.json",
    "acquire": "Copy extensions.json from Firefox profile; individual extensions are not the same input structure",
    "note": "Expected top-level addons/extensions list. An individual WebExtension manifest.json is not accepted as equivalent without conversion."
  },
  "Firefox History Parser": {
    "input": "Raw Firefox places.sqlite (SQLite database)",
    "source": "%APPDATA%\\Mozilla\\Firefox\\Profiles\\<profile>\\places.sqlite",
    "acquire": "Collect places.sqlite plus WAL/SHM, merge/checkpoint on copy before importing",
    "note": "Native SQLite reader, but no WAL replay: copy database together with -wal/-shm and make a safe checkpointed working copy before import. Browser/profile versions differ; no encrypted cookie decryption."
  },
  "Frequency distribution": {
    "input": "Arbitrary raw file bytes",
    "source": "Any captured file, recovered payload or memory extraction",
    "acquire": "Open file from HexSpindle input pane",
    "note": "Heuristics vary by data type; report offsets from original evidence."
  },
  "IIS Log Parser": {
    "input": "Plain text W3C IIS log",
    "source": "C:\\inetpub\\logs\\LogFiles\\W3SVC*\\u_ex*.log",
    "acquire": "Collect log files; preserve #Fields header",
    "note": "Check field order in header; not every IIS configuration logs identical columns."
  },
  "Index of Coincidence": {
    "input": "Arbitrary raw file bytes",
    "source": "Any captured file, recovered payload or memory extraction",
    "acquire": "Open file from HexSpindle input pane",
    "note": "Heuristics vary by data type; report offsets from original evidence."
  },
  "IOC Deduplicator and Normalizer": {
    "input": "Plain text or JSON of observables",
    "source": "Threat intelligence reports, logs, mail headers, extracted scripts",
    "acquire": "Paste text or provide file; manually review false positives",
    "note": "Normalize carefully: do not lose evidence of original obfuscation."
  },
  "IOC Extractor with Context": {
    "input": "Plain text or JSON of observables",
    "source": "Threat intelligence reports, logs, mail headers, extracted scripts",
    "acquire": "Paste text or provide file; manually review false positives",
    "note": "Normalize carefully: do not lose evidence of original obfuscation."
  },
  "Java JAR Metadata Analyzer": {
    "input": "Raw JAR (ZIP archive)",
    "source": "Application directories, .m2/repository or build outputs",
    "acquire": "Copy .jar; compare unzip -l and META-INF/MANIFEST.MF",
    "note": "ZIP payload may contain nested dependencies."
  },
  "Jump List Parser": {
    "input": "Raw .automaticDestinations-ms or .customDestinations-ms file",
    "source": "C:\\Users\\<user>\\AppData\\Roaming\\Microsoft\\Windows\\Recent\\AutomaticDestinations\\ and CustomDestinations\\\\",
    "acquire": "Collect via KAPE; use JLECmd for authoritative CFB/OLE + DestList interpretation",
    "note": "Current implementation scans embedded LNK signature candidates, not full Compound File Binary/CustomDestinations or DestList parsing."
  },
  "Kerberos Event Analyzer": {
    "input": "Exported Event XML (<Event>...), or event JSON array/JSONL; raw binary .evtx is NOT decoded",
    "source": "%SystemRoot%\\System32\\winevt\\Logs\\Security.evtx",
    "acquire": "Collect the .evtx binary for chain of custody; for this analyzer, export individual XML events using Get-WinEvent -Path <file.evtx> | ForEach-Object { $_.ToXml() }; alternatively use evtx_dump/EvtxECmd then normalize output schema. Relevant channel: Security",
    "note": "Known IDs: 4768/4769/4771. Current analyzer requires decoded events (XML/JSON), and explicitly rejects raw EVTX rather than silently returning empty results. Multi-Event XML and JSON schemas vary by exporter."
  },
  "Linux Auditd Parser": {
    "input": "Plain-text Linux auditd record lines (not a binary data file)",
    "source": "/var/log/audit/audit.log and rotated audit.log.*",
    "acquire": "Collect auditd logs from disk image or auditctl/ausearch output preserving timestamps; report source host/timezone",
    "note": "Analyzes text audit records; not a Linux filesystem journal or binary audit file."
  },
  "Linux Auth Log Analyzer": {
    "input": "Text sshd/auth log",
    "source": "/var/log/auth.log (Debian/Ubuntu), /var/log/secure (RHEL)",
    "acquire": "Copy logs or journalctl -u sshd --output=short-iso",
    "note": "Rotated/compressed logs should be expanded before input."
  },
  "Mach-O Code Signature Inspector": {
    "input": "Raw Mach-O executable or dylib",
    "source": "macOS /Applications/<App>.app/Contents/MacOS/, /usr/bin and libraries",
    "acquire": "Copy from macOS disk image; compare otool -hv and codesign -dv",
    "note": "Inspecting signature blob is not complete code-signing verification."
  },
  "Mach-O Header Parser": {
    "input": "Raw Mach-O executable or dylib",
    "source": "macOS /Applications/<App>.app/Contents/MacOS/, /usr/bin and libraries",
    "acquire": "Copy from macOS disk image; compare otool -hv and codesign -dv",
    "note": "Inspecting signature blob is not complete code-signing verification."
  },
  "macOS Unified Log JSON Analyzer": {
    "input": "macOS unified log structured JSON (not raw .tracev3)",
    "source": "Unified logging data under /var/db/diagnostics and /var/db/uuidtext (system/version dependent)",
    "acquire": "Use macOS log show --style json with an appropriate --archive/--last filter on an authorized system or compatible forensic exporter",
    "note": "Direct raw .tracev3 chunk decoding is NOT supported in this operation."
  },
  "Microsoft 365 Audit Log Analyzer": {
    "input": "Unified Audit Log JSON/CSV export",
    "source": "Microsoft Purview Audit / Microsoft 365 audit records",
    "acquire": "Purview Audit search export or Search-UnifiedAuditLog",
    "note": "Permissions, retention and tenant settings affect available events."
  },
  ".NET Assembly Metadata Parser": {
    "input": "Raw managed .NET PE assembly (.exe/.dll) with CLR metadata (not any native PE)",
    "source": "Suspect executable from disk, memory dump extraction, quarantine or malware sample",
    "acquire": "FTK Imager, PE-sieve, Volatility extraction, or copy original sample",
    "note": "Run PE CLR Managed Detector first. If the input is a native PE without the CLR data directory, this operation reports managed:false, applicable:false (not a decoder failure). Managed/mixed-mode and obfuscated assemblies require reference-tool cross-check."
  },
  ".NET User String Extractor": {
    "input": "Raw managed .NET PE assembly (.exe/.dll) with CLR metadata (not any native PE)",
    "source": "Suspect executable from disk, memory dump extraction, quarantine or malware sample",
    "acquire": "FTK Imager, PE-sieve, Volatility extraction, or copy original sample",
    "note": "Run PE CLR Managed Detector first. If the input is a native PE without the CLR data directory, this operation reports managed:false, applicable:false (not a decoder failure). Managed/mixed-mode and obfuscated assemblies require reference-tool cross-check."
  },
  "NTFS Alternate Data Streams Analyzer": {
    "input": "Single raw 1024-byte (or native record-size) NTFS FILE record, NOT the entire $MFT file",
    "source": "NTFS volume root: C:\\$MFT (individual FILE record must be carved out)",
    "acquire": "Extract the target record bytes with an NTFS-aware tool (MFTECmd/forensic image hex extractor); do not feed an MFTECmd CSV file",
    "note": "Reads the first FILE record in the buffer. The ADS operation reports named $DATA streams based on record attributes, not stream contents."
  },
  "NTFS Attribute Inspector": {
    "input": "Single raw 1024-byte (or native record-size) NTFS FILE record, NOT the entire $MFT file",
    "source": "NTFS volume root: C:\\$MFT (individual FILE record must be carved out)",
    "acquire": "Extract the target record bytes with an NTFS-aware tool (MFTECmd/forensic image hex extractor); do not feed an MFTECmd CSV file",
    "note": "Reads the first FILE record in the buffer. The ADS operation reports named $DATA streams based on record attributes, not stream contents."
  },
  "NTFS MFT Parser": {
    "input": "Raw $MFT file or concatenated FILE records",
    "source": "NTFS volume root metadata file: C:\\$MFT (normally inaccessible through standard File Explorer)",
    "acquire": "Acquire raw NTFS metadata using KAPE/RawCopy, FTK Imager, or extract $MFT from a forensic volume image; MFTECmd produces a derived CSV, not the original bytes",
    "note": "FILE records are decoded with record-size assumption; verify record size and USA fixups from volume geometry, and expect version-specific attributes."
  },
  "OpenSave MRU Analyzer": {
    "input": "Raw NTUSER.DAT registry hive (regf)",
    "source": "C:\\Users\\<user>\\NTUSER.DAT: Software\\Microsoft\\Windows\\CurrentVersion\\Explorer\\ComDlg32\\OpenSavePidlMRU",
    "acquire": "Collect the raw hive and matching .LOG1/.LOG2 transaction logs using KAPE RegistryHives, FTK Imager, or a forensic image; the current parser reads only the supplied base hive (no transaction-log replay)",
    "note": "Forensic string candidates are extracted from PIDL data, not full PIDL path reconstruction; raw hive is preferred."
  },
  "Parse ELF Header": {
    "input": "Raw ELF binary (.so, executable, .o)",
    "source": "Linux /bin, /usr/bin, /usr/lib, containers or disk image",
    "acquire": "Copy with evidence provenance; compare readelf -h -S -s -r -n",
    "note": "For stripped binaries, many symbol tables will be absent."
  },
  "Parse PE Header": {
    "input": "Raw PE .exe, .dll or .sys bytes",
    "source": "Suspect executable from disk, memory dump extraction, quarantine or malware sample",
    "acquire": "FTK Imager, PE-sieve, Volatility extraction, or copy original sample",
    "note": "Signature inspection is not cryptographic trust-chain validation. Use sigcheck/osslsigncode for independent comparison."
  },
  "Parse UNIX file permissions": {
    "input": "Textual permission/mode input",
    "source": "Unix file metadata",
    "acquire": "stat -c %a,%f file or ls -l",
    "note": "This operation accepts mode representation, not an image of a filesystem."
  },
  "PE Authenticode Inspector": {
    "input": "Raw PE .exe, .dll or .sys bytes",
    "source": "Suspect executable from disk, memory dump extraction, quarantine or malware sample",
    "acquire": "FTK Imager, PE-sieve, Volatility extraction, or copy original sample",
    "note": "Signature inspection is not cryptographic trust-chain validation. Use sigcheck/osslsigncode for independent comparison."
  },
  "PE Import Hash (imphash)": {
    "input": "Raw portable executable bytes (.exe/.dll/.sys), not a textual import listing",
    "source": "Malware sample, installed executable, carved PE from image",
    "acquire": "Acquire unchanged PE and cross-check imphash with pefile/Detect It Easy",
    "note": "PE import table functions parsed from binary; ordinal-only imports and uncommon bound imports need independent comparison."
  },
  "PE Packer Heuristics": {
    "input": "Raw PE .exe, .dll or .sys bytes",
    "source": "Suspect executable from disk, memory dump extraction, quarantine or malware sample",
    "acquire": "FTK Imager, PE-sieve, Volatility extraction, or copy original sample",
    "note": "Signature inspection is not cryptographic trust-chain validation. Use sigcheck/osslsigncode for independent comparison."
  },
  "PE Resource Inspector": {
    "input": "Raw PE .exe, .dll or .sys bytes",
    "source": "Suspect executable from disk, memory dump extraction, quarantine or malware sample",
    "acquire": "FTK Imager, PE-sieve, Volatility extraction, or copy original sample",
    "note": "Signature inspection is not cryptographic trust-chain validation. Use sigcheck/osslsigncode for independent comparison."
  },
  "PE Rich Header Parser": {
    "input": "Raw PE .exe, .dll or .sys bytes",
    "source": "Suspect executable from disk, memory dump extraction, quarantine or malware sample",
    "acquire": "FTK Imager, PE-sieve, Volatility extraction, or copy original sample",
    "note": "Signature inspection is not cryptographic trust-chain validation. Use sigcheck/osslsigncode for independent comparison."
  },
  "PE Section Analyzer": {
    "input": "Raw PE .exe, .dll or .sys bytes",
    "source": "Suspect executable from disk, memory dump extraction, quarantine or malware sample",
    "acquire": "FTK Imager, PE-sieve, Volatility extraction, or copy original sample",
    "note": "Signature inspection is not cryptographic trust-chain validation. Use sigcheck/osslsigncode for independent comparison."
  },
  "PowerShell Script Block Analyzer": {
    "input": "Exported Event XML (<Event>...), or event JSON array/JSONL; raw binary .evtx is NOT decoded",
    "source": "%SystemRoot%\\System32\\winevt\\Logs\\Microsoft-Windows-PowerShell%4Operational.evtx",
    "acquire": "Collect the .evtx binary for chain of custody; for this analyzer, export individual XML events using Get-WinEvent -Path <file.evtx> | ForEach-Object { $_.ToXml() }; alternatively use evtx_dump/EvtxECmd then normalize output schema. Relevant channel: Microsoft-Windows-PowerShell/Operational",
    "note": "Known IDs: 4104. Current analyzer requires decoded events (XML/JSON), and explicitly rejects raw EVTX rather than silently returning empty results. Multi-Event XML and JSON schemas vary by exporter."
  },
  "RDP Activity Analyzer": {
    "input": "Exported Event XML (<Event>...), or event JSON array/JSONL; raw binary .evtx is NOT decoded",
    "source": "%SystemRoot%\\System32\\winevt\\Logs\\Security.evtx; Microsoft-Windows-TerminalServices-RemoteConnectionManager%4Operational.evtx; Microsoft-Windows-TerminalServices-LocalSessionManager%4Operational.evtx",
    "acquire": "Collect the .evtx binary for chain of custody; for this analyzer, export individual XML events using Get-WinEvent -Path <file.evtx> | ForEach-Object { $_.ToXml() }; alternatively use evtx_dump/EvtxECmd then normalize output schema. Relevant channel: Security",
    "note": "Known IDs: 1149/21/22/24/25 and 4624 type 10. Current analyzer requires decoded events (XML/JSON), and explicitly rejects raw EVTX rather than silently returning empty results. Multi-Event XML and JSON schemas vary by exporter."
  },
  "RecentDocs Analyzer": {
    "input": "Raw NTUSER.DAT registry hive (regf)",
    "source": "C:\\Users\\<user>\\NTUSER.DAT: Software\\Microsoft\\Windows\\CurrentVersion\\Explorer\\RecentDocs",
    "acquire": "Collect the raw hive and matching .LOG1/.LOG2 transaction logs using KAPE RegistryHives, FTK Imager, or a forensic image; the current parser reads only the supplied base hive (no transaction-log replay)",
    "note": "The implementation reads native registry key values; exported JSON or .reg are not supported."
  },
  "Remove EXIF": {
    "input": "JPEG with EXIF tags",
    "source": "Captured JPEG image",
    "acquire": "Acquire original JPEG unmodified",
    "note": "Removing EXIF is a transformation, not a forensic evidence-preservation action."
  },
  "Run Key Analyzer": {
    "input": "Raw SOFTWARE hive (machine Run keys) OR raw NTUSER.DAT (per-user Run keys)",
    "source": "C:\\Windows\\System32\\config\\SOFTWARE (HKLM); C:\\Users\\<user>\\NTUSER.DAT (HKCU)",
    "acquire": "Collect the raw hive and matching .LOG1/.LOG2 transaction logs using KAPE RegistryHives, FTK Imager, or a forensic image; the current parser reads only the supplied base hive (no transaction-log replay)",
    "note": "Reads Run/RunOnce values from a native regf hive. Text/JSON exports are NOT accepted by the current implementation; HKCU and HKLM need separate runs."
  },
  "Scan for Embedded Files": {
    "input": "Arbitrary raw file bytes",
    "source": "Any captured file, recovered payload or memory extraction",
    "acquire": "Open file from HexSpindle input pane",
    "note": "Heuristics vary by data type; report offsets from original evidence."
  },
  "Scheduled Task XML Parser": {
    "input": "Raw task XML text",
    "source": "C:\\Windows\\System32\\Tasks\\* or schtasks /query /xml",
    "acquire": "KAPE/FTK Imager or schtasks /query /tn <task> /xml",
    "note": "Import XML content, not the running .exe."
  },
  "ShellBags Parser": {
    "input": "Raw UsrClass.dat registry hive (regf); older Windows may store comparable keys in NTUSER.DAT",
    "source": "C:\\Users\\<user>\\AppData\\Local\\Microsoft\\Windows\\UsrClass.dat (Local Settings\\Software\\Microsoft\\Windows\\Shell\\BagMRU)",
    "acquire": "Collect the raw hive and matching .LOG1/.LOG2 transaction logs using KAPE RegistryHives, FTK Imager, or a forensic image; the current parser reads only the supplied base hive (no transaction-log replay)",
    "note": "Current output is recovered candidate strings, not a complete shell item ID-list decoder or definitive folder access timeline."
  },
  "ShimCache Parser": {
    "input": "Raw SYSTEM registry hive (regf)",
    "source": "C:\\Windows\\System32\\config\\SYSTEM: ControlSet00x\\Control\\Session Manager\\AppCompatCache",
    "acquire": "Collect the raw hive and matching .LOG1/.LOG2 transaction logs using KAPE RegistryHives, FTK Imager, or a forensic image; the current parser reads only the supplied base hive (no transaction-log replay)",
    "note": "ShimCache layout depends on OS version; parser currently extracts path-like strings, not fully decoded per-build entries or execution timestamps."
  },
  "Sigma Rule Evaluator (Subset)": {
    "input": "Sigma-like rule plus normalized events (see operation scope)",
    "source": "Detection rule YAML/JSON and event records",
    "acquire": "Export events as JSON; compare with sigma-cli and backend",
    "note": "Supports only a subset of Sigma: not production rule-engine parity."
  },
  "Startup Artifact Correlator": {
    "input": "JSON array of previously extracted startup records",
    "source": "Combine Windows Run, Services, Scheduled Tasks and Startup-folder artifacts",
    "acquire": "KAPE + RECmd, Autoruns, or JSON exported by other tools",
    "note": "Normalization/correlation input is structured data, not a raw registry hive."
  },
  "Startup Artifact JSON Normalizer": {
    "input": "JSON array of previously extracted startup records",
    "source": "Combine Windows Run, Services, Scheduled Tasks and Startup-folder artifacts",
    "acquire": "KAPE + RECmd, Autoruns, or JSON exported by other tools",
    "note": "Normalization/correlation input is structured data, not a raw registry hive."
  },
  "Strings": {
    "input": "Arbitrary raw file bytes",
    "source": "Any captured file, recovered payload or memory extraction",
    "acquire": "Open file from HexSpindle input pane",
    "note": "Heuristics vary by data type; report offsets from original evidence."
  },
  "Suspicious Script Analyzer": {
    "input": "Script source or raw sample bytes",
    "source": "PowerShell scripts, WSH scripts, JavaScript attachments, extracted malware",
    "acquire": "Export .ps1/.js/.vbs or carved sample; preserve hashes",
    "note": "Heuristic analysis, not evidence of execution or maliciousness."
  },
  "Sysmon Event Normalizer": {
    "input": "Exported Event XML (<Event>...), or event JSON array/JSONL; raw binary .evtx is NOT decoded",
    "source": "%SystemRoot%\\System32\\winevt\\Logs\\Microsoft-Windows-Sysmon%4Operational.evtx",
    "acquire": "Collect the .evtx binary for chain of custody; for this analyzer, export individual XML events using Get-WinEvent -Path <file.evtx> | ForEach-Object { $_.ToXml() }; alternatively use evtx_dump/EvtxECmd then normalize output schema. Relevant channel: Microsoft-Windows-Sysmon/Operational",
    "note": "Known IDs: Sysmon 1,3,7,11,22, etc.. Current analyzer requires decoded events (XML/JSON), and explicitly rejects raw EVTX rather than silently returning empty results. Multi-Event XML and JSON schemas vary by exporter."
  },
  "Timeline Builder": {
    "input": "JSON / JSONL records with timestamps",
    "source": "Derived records from multiple evidence sources",
    "acquire": "Normalize timestamp fields to ISO 8601 UTC before import",
    "note": "Record source and original time zone."
  },
  "UserAssist Decoder": {
    "input": "Raw NTUSER.DAT hive (regf), or ROT13-encoded value-name text for a simple decode",
    "source": "C:\\Users\\<user>\\NTUSER.DAT: Software\\Microsoft\\Windows\\CurrentVersion\\Explorer\\UserAssist\\{GUID}\\Count",
    "acquire": "Collect the raw hive and matching .LOG1/.LOG2 transaction logs using KAPE RegistryHives, FTK Imager, or a forensic image; the current parser reads only the supplied base hive (no transaction-log replay)",
    "note": "Full user history requires the user hive; a single ROT13 string only decodes the name, not run count or last run."
  },
  "USN Journal Parser": {
    "input": "Raw binary USN_RECORD_V2/V3 sequences (journal $J stream)",
    "source": "NTFS alternate data stream C:\\$Extend\\$UsnJrnl:$J",
    "acquire": "Extract the binary $J stream from an image or NTFS-aware forensic collection; do not import human-readable fsutil text or an exported CSV",
    "note": "Supports V2/V3 structures with limited validation; $Max metadata stream is not the $J event stream."
  },
  "Windows Event ID Explainer": {
    "input": "Text containing Windows event IDs",
    "source": "Security / System / PowerShell / Sysmon event IDs",
    "acquire": "Copy IDs or list from events; Windows Event Viewer",
    "note": "Maps known IDs; not full event parser."
  },
  "EVTX to JSON": {
    "input": "Native Windows Event Log .evtx (raw ElfFile binary; no XML/JSON export needed)",
    "source": "%SystemRoot%\\System32\\winevt\\Logs\\Security.evtx or Microsoft-Windows-<channel>%4<subchannel>.evtx; actual channel location may differ",
    "acquire": "Export a native log with wevtutil epl Security C:\\Evidence\\Security.evtx; or export your channel with wevtutil epl \"Microsoft-Windows-SMBServer/Connectivity\" C:\\Evidence\\SMB.evtx; KAPE/FTK Imager also work",
    "note": "Use first in a recipe, then Windows Logon Analyzer, Sysmon Event Normalizer, Kerberos Event Analyzer, etc. Produces an array of normalized events, not a raw .evtx file. Not all uncommon BinXML types or damaged records are supported; decoding failures are reported, not silently ignored. Default limit is 1,000 events."
  },
  "EVTX to XML": {
    "input": "Native Windows Event Log .evtx (raw ElfFile binary, not EVTX exported as .xml)",
    "source": "%SystemRoot%\\System32\\winevt\\Logs\\*.evtx; confirm with wevtutil gl <channel>",
    "acquire": "wevtutil epl System C:\\Evidence\\System.evtx, or collect with KAPE / FTK Imager",
    "note": "Place directly BEFORE an XML-aware event operation, e.g. Windows Logon Analyzer. Emits a well-formed <Events> XML document containing individual <Event> records. Not an exhaustive BinXML implementation; errors are explicit. Default maximum 1,000 events."
  },
  "Windows EVTX Metadata Inspector": {
    "input": "Raw Windows .evtx binary (ElfFile signature)",
    "source": "%SystemRoot%\\System32\\winevt\\Logs\\*.evtx; examples: Security.evtx and Microsoft-Windows-SMBServer%4Connectivity.evtx (SMBServer/Connectivity)",
    "acquire": "Collect raw .evtx with KAPE/FTK Imager, or use wevtutil epl Security C:\\Evidence\\Security.evtx; for SMBServer use wevtutil epl \"Microsoft-Windows-SMBServer/Connectivity\" C:\\Evidence\\SMBServer-Connectivity.evtx; verify actual configured path with wevtutil gl <channel>",
    "note": "Native header, chunk framing, record IDs and record timestamps ONLY. EventID, Provider, EventData and BinXML XML are NOT decoded; use a full parser for event-level analysis."
  },
  "Windows LNK Parser": {
    "input": "Raw Shell Link (.lnk) file bytes",
    "source": "C:\\Users\\<user>\\AppData\\Roaming\\Microsoft\\Windows\\Recent\\*.lnk; desktop/startup folders",
    "acquire": "Acquire the .lnk binary with KAPE or FTK Imager and compare with LECmd",
    "note": "Reports main header, links and some string data; not every shell item or extradata block is decoded."
  },
  "Windows Logon Analyzer": {
    "input": "Exported Event XML (<Event>...), or event JSON array/JSONL; raw binary .evtx is NOT decoded",
    "source": "%SystemRoot%\\System32\\winevt\\Logs\\Security.evtx",
    "acquire": "Collect the .evtx binary for chain of custody; for this analyzer, export individual XML events using Get-WinEvent -Path <file.evtx> | ForEach-Object { $_.ToXml() }; alternatively use evtx_dump/EvtxECmd then normalize output schema. Relevant channel: Security",
    "note": "Known IDs: 4624/4625/4634/4648/4776. Current analyzer requires decoded events (XML/JSON), and explicitly rejects raw EVTX rather than silently returning empty results. Multi-Event XML and JSON schemas vary by exporter."
  },
  "Windows Prefetch Parser": {
    "input": "Raw Windows .pf file (uncompressed SCCA or compressed MAM04 XPRESS-Huffman)",
    "source": "C:\\Windows\\Prefetch\\*.pf",
    "acquire": "Use KAPE Prefetch target, FTK Imager, or an offline Windows image; cross-check with PECmd (Eric Zimmerman)",
    "note": "MAM04 decoding is now attempted with strict SCCA/length validation but has not yet been independently validated on a real compressed Windows Prefetch corpus."
  },
  "Windows Recycle Bin Parser": {
    "input": "Raw $I metadata binary file (NOT its $R content companion)",
    "source": "C:\\$Recycle.Bin\\<SID>\\$I*",
    "acquire": "Collect $I and matching $R files using a forensic volume image, KAPE or FTK Imager",
    "note": "Parses known $I format versions; a normal deleted-file $R is not an $I record."
  },
  "Windows Registry Hive Inspector": {
    "input": "Raw base registry hive (regf), not .reg text or individual exported keys",
    "source": "C:\\Windows\\System32\\config\\SYSTEM, SOFTWARE, SAM, SECURITY; C:\\Users\\<user>\\NTUSER.DAT; ...\\UsrClass.dat",
    "acquire": "Collect the raw hive and matching .LOG1/.LOG2 transaction logs using KAPE RegistryHives, FTK Imager, or a forensic image; the current parser reads only the supplied base hive (no transaction-log replay)",
    "note": "Traversal of base hive only; deleted-cell recovery, transaction-log replay, and forensic key interpretation are out of scope."
  },
  "Windows Service Installation Detector": {
    "input": "Exported Event XML (<Event>...), or event JSON array/JSONL; raw binary .evtx is NOT decoded",
    "source": "%SystemRoot%\\System32\\winevt\\Logs\\System.evtx and Security.evtx",
    "acquire": "Collect the .evtx binary for chain of custody; for this analyzer, export individual XML events using Get-WinEvent -Path <file.evtx> | ForEach-Object { $_.ToXml() }; alternatively use evtx_dump/EvtxECmd then normalize output schema. Relevant channel: System",
    "note": "Known IDs: 7045/4697. Current analyzer requires decoded events (XML/JSON), and explicitly rejects raw EVTX rather than silently returning empty results. Multi-Event XML and JSON schemas vary by exporter."
  },
  "Windows Services Registry Analyzer": {
    "input": "Raw SYSTEM registry hive (regf)",
    "source": "C:\\Windows\\System32\\config\\SYSTEM; ControlSet00x\\Services\\<service>",
    "acquire": "Collect the raw hive and matching .LOG1/.LOG2 transaction logs using KAPE RegistryHives, FTK Imager, or a forensic image; the current parser reads only the supplied base hive (no transaction-log replay)",
    "note": "The parser expects a native SYSTEM hive, not an exported .reg file, JSON, or text. No transaction-log replay."
  },
  "Windows Timeline ActivitiesCache Parser": {
    "input": "Raw SQLite ActivitiesCache.db (base DB only)",
    "source": "C:\\Users\\<user>\\AppData\\Local\\ConnectedDevicesPlatform\\<account-folder>\\ActivitiesCache.db",
    "acquire": "Collect database and -wal/-shm via forensic image; merge/checkpoint on a working copy before import if active WAL contains recent entries",
    "note": "WAL replay is NOT implemented in the HexSpindle browser SQLite reader; input base DB alone can omit recent records."
  },
  "YARA Rules": {
    "input": "Raw input bytes to scan with a user-provided YARA rule argument",
    "source": "Any captured file or extracted sample",
    "acquire": "Open the sample file, then configure the rule argument within the recipe card; do not import a .yar file as the sample itself",
    "note": "YARA evaluation uses the vendored YARA WASM bundle and rule argument; maliciousness conclusions require analyst review."
  },
  "Zone.Identifier ADS Parser": {
    "input": "Text content of the Zone.Identifier named NTFS alternate data stream (not the parent file)",
    "source": "<downloaded-file>:Zone.Identifier",
    "acquire": "PowerShell: Get-Content -LiteralPath \"C:\\Evidence\\sample.exe\" -Stream Zone.Identifier; or ADS-aware forensic acquisition",
    "note": "Some downloads lack MOTW/Zone.Identifier; absence does not imply local provenance."
  }
,
  "Windows Event Log Summary": {
    "input": "Decoded Windows event JSON array or XML document (use EVTX to JSON/XML before this operation)",
    "source": "C:\\Windows\\System32\\winevt\\Logs\\; actual channel path may vary",
    "acquire": "On evidence image collect the raw .evtx using KAPE/FTK Imager; or use wevtutil epl \"<channel>\" C:\\Evidence\\events.evtx; then EVTX to JSON/XML in recipe",
    "note": "Summary over selected events; counts and time range do not certify acquisition completeness."
  },
  "Windows Event Log Filter": {
    "input": "Decoded Windows event JSON array or XML document (use EVTX to JSON/XML before this operation)",
    "source": "C:\\Windows\\System32\\winevt\\Logs\\; actual channel path may vary",
    "acquire": "On evidence image collect the raw .evtx using KAPE/FTK Imager; or use wevtutil epl \"<channel>\" C:\\Evidence\\events.evtx; then EVTX to JSON/XML in recipe",
    "note": "Enter comma-separated event IDs or a provider substring; works as JSON-to-JSON pipeline step after EVTX to JSON. Max output capped."
  },
  "Windows Event Log Integrity Analyzer": {
    "input": "Decoded Windows event JSON array or XML document (use EVTX to JSON/XML before this operation)",
    "source": "C:\\Windows\\System32\\winevt\\Logs\\Security.evtx and System.evtx",
    "acquire": "On evidence image collect the raw .evtx using KAPE/FTK Imager; or use wevtutil epl \"<channel>\" C:\\Evidence\\events.evtx; then EVTX to JSON/XML in recipe",
    "note": "Looks for cleared log/audit-policy event IDs 1102, 4719, etc.; EventLog provider 104. Empty output does not mean logs are intact."
  },
  "Windows Account & Group Changes": {
    "input": "Decoded Windows event JSON array or XML document (use EVTX to JSON/XML before this operation)",
    "source": "C:\\Windows\\System32\\winevt\\Logs\\Security.evtx on the relevant workstation or domain controller",
    "acquire": "On evidence image collect the raw .evtx using KAPE/FTK Imager; or use wevtutil epl \"<channel>\" C:\\Evidence\\events.evtx; then EVTX to JSON/XML in recipe",
    "note": "Security 4720-4757 subset. Account audit policies determine visibility."
  },
  "Windows Scheduled Task Event Analyzer": {
    "input": "Decoded Windows event JSON array or XML document (use EVTX to JSON/XML before this operation)",
    "source": "C:\\Windows\\System32\\winevt\\Logs\\Security.evtx and Microsoft-Windows-TaskScheduler%4Operational.evtx",
    "acquire": "On evidence image collect the raw .evtx using KAPE/FTK Imager; or use wevtutil epl \"<channel>\" C:\\Evidence\\events.evtx; then EVTX to JSON/XML in recipe",
    "note": "Security 4698-4702; Microsoft-Windows-TaskScheduler provider 106, 140, 141, 200, 201, 102. Requires relevant auditing."
  },
  "Windows Process Execution Events": {
    "input": "Decoded Windows event JSON array or XML document (use EVTX to JSON/XML before this operation)",
    "source": "C:\\Windows\\System32\\winevt\\Logs\\Security.evtx and Microsoft-Windows-Sysmon%4Operational.evtx",
    "acquire": "On evidence image collect the raw .evtx using KAPE/FTK Imager; or use wevtutil epl \"<channel>\" C:\\Evidence\\events.evtx; then EVTX to JSON/XML in recipe",
    "note": "Security 4688 and Sysmon 1/5 (when installed). 4688 command-line capture must be configured; process creation does not prove malicious activity."
  },
  "Sysmon Persistence Event Analyzer": {
    "input": "Decoded Windows event JSON array or XML document (use EVTX to JSON/XML before this operation)",
    "source": "C:\\Windows\\System32\\winevt\\Logs\\Microsoft-Windows-Sysmon%4Operational.evtx",
    "acquire": "On evidence image collect the raw .evtx using KAPE/FTK Imager; or use wevtutil epl \"<channel>\" C:\\Evidence\\events.evtx; then EVTX to JSON/XML in recipe",
    "note": "Sysmon 12–14 registry and 19–21 WMI; filters depend on Sysmon configuration. No verdict."
  },
  "Windows SMB Share Event Analyzer": {
    "input": "Decoded Windows event JSON array or XML document (use EVTX to JSON/XML before this operation)",
    "source": "C:\\Windows\\System32\\winevt\\Logs\\Security.evtx and Microsoft-Windows-SMBServer%4Connectivity.evtx",
    "acquire": "On evidence image collect the raw .evtx using KAPE/FTK Imager; or use wevtutil epl \"<channel>\" C:\\Evidence\\events.evtx; then EVTX to JSON/XML in recipe",
    "note": "Security 5140/5142–5145 and SMBServer provider events; SMBServer EventIDs have channel-specific meanings and opaque binary ClientAddress is not guessed as an IP."
  },
  "PE CLR Managed Detector": {
    "input": "Raw Windows PE (.exe or .dll), managed or native",
    "source": "Any collected Windows executable/DLL (Windows System32, user application directory, or forensic image)",
    "acquire": "Collect the raw executable using KAPE/FTK Imager, or copy from a forensic disk image. Examine its CLR directory; an .exe/.dll extension alone does not mean managed code.",
    "note": "Presence of a CLR directory is a structural indicator, not verification of loadability, signed code or security."
  },
};
