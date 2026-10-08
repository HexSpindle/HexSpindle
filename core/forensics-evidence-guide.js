// SPDX-License-Identifier: MIT
// Evidence acquisition guidance. Paths are illustrative, not access instructions.
export const FORENSICS_EVIDENCE_GUIDE = {
  "Amcache Parser": {
    "input": "Amcache.hve binary hive",
    "source": "C:\\Windows\\AppCompat\\Programs\\Amcache.hve",
    "acquire": "KAPE/FTK Imager or registry-aware forensic acquisition",
    "note": "This is an inspector, not complete Amcache transaction-log replay."
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
    "input": "Registry hive or exported BAM/DAM values",
    "source": "SYSTEM: ControlSet00x\\Services\\bam\\State\\UserSettings; dam equivalent when present",
    "acquire": "RECmd, KAPE or Registry Explorer",
    "note": "Not every Windows build populates the same keys."
  },
  "Browser Cookies Metadata Parser": {
    "input": "Raw SQLite Cookies / cookies.sqlite (no decryption)",
    "source": "Chrome/Edge profile Network\\Cookies; Firefox profile cookies.sqlite",
    "acquire": "KAPE, FTK Imager, profile collection",
    "note": "Encrypted cookie values are not automatically decrypted."
  },
  "Chi Square": {
    "input": "Arbitrary raw file bytes",
    "source": "Any captured file, recovered payload or memory extraction",
    "acquire": "Open file from HexSpindle input pane",
    "note": "Heuristics vary by data type; report offsets from original evidence."
  },
  "Chrome History Parser": {
    "input": "Raw SQLite History database",
    "source": "Chrome: %LOCALAPPDATA%\\Google\\Chrome\\User Data\\Default\\History; Edge: %LOCALAPPDATA%\\Microsoft\\Edge\\User Data\\Default\\History",
    "acquire": "KAPE, FTK Imager; copy History plus -wal / -shm",
    "note": "Locked live SQLite databases should be acquired from shadow copy or offline image."
  },
  "Chromium Downloads Parser": {
    "input": "Raw SQLite History database",
    "source": "Chrome: %LOCALAPPDATA%\\Google\\Chrome\\User Data\\Default\\History; Edge: %LOCALAPPDATA%\\Microsoft\\Edge\\User Data\\Default\\History",
    "acquire": "KAPE, FTK Imager; copy History plus -wal / -shm",
    "note": "Locked live SQLite databases should be acquired from shadow copy or offline image."
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
    "input": "Exported Windows event XML or normalized JSON/JSONL",
    "source": "Security.evtx; Microsoft-Windows-Sysmon%4Operational.evtx; PowerShell/Operational; TerminalServices logs; Defender Operational",
    "acquire": "wevtutil qe <channel> /f:xml; Get-WinEvent | ConvertTo-Json; hayabusa or Chainsaw for EVTX-to-JSON",
    "note": "These analyzers are not binary EVTX decoders: export structured events first."
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
    "input": "Firefox extensions.json / extension manifest.json",
    "source": "%APPDATA%\\Mozilla\\Firefox\\Profiles\\<profile>\\extensions.json",
    "acquire": "KAPE / copy Firefox profile",
    "note": "Verify parser input format (manifest versus extensions list)."
  },
  "Firefox History Parser": {
    "input": "Raw SQLite places.sqlite",
    "source": "%APPDATA%\\Mozilla\\Firefox\\Profiles\\<profile>\\places.sqlite",
    "acquire": "KAPE, FTK Imager; preserve WAL files",
    "note": "Profile name varies; choose the active profile."
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
    "input": "Raw automaticDestinations-ms / customDestinations-ms",
    "source": "%APPDATA%\\Microsoft\\Windows\\Recent\\AutomaticDestinations\\ and CustomDestinations\\",
    "acquire": "KAPE or JLECmd",
    "note": "Some Jump Lists contain OLE compound files; check parser limitations."
  },
  "Kerberos Event Analyzer": {
    "input": "Exported Windows event XML or normalized JSON/JSONL",
    "source": "Security.evtx; Microsoft-Windows-Sysmon%4Operational.evtx; PowerShell/Operational; TerminalServices logs; Defender Operational",
    "acquire": "wevtutil qe <channel> /f:xml; Get-WinEvent | ConvertTo-Json; hayabusa or Chainsaw for EVTX-to-JSON",
    "note": "These analyzers are not binary EVTX decoders: export structured events first."
  },
  "Linux Auditd Parser": {
    "input": "Text, JSON or raw evidence bytes as supported by the operation",
    "source": "Consult the evidence source and operation-specific parser implementation",
    "acquire": "Forensic imaging, KAPE, FTK Imager or source-native exporter",
    "note": "Validate with a specialized tool before relying on output."
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
    "input": "Structured JSON export",
    "source": "macOS unified logging datastore",
    "acquire": "log show --style json --last 1h > unified.json (where supported)",
    "note": "Requires JSON export; not a raw tracev3 parser."
  },
  "Microsoft 365 Audit Log Analyzer": {
    "input": "Unified Audit Log JSON/CSV export",
    "source": "Microsoft Purview Audit / Microsoft 365 audit records",
    "acquire": "Purview Audit search export or Search-UnifiedAuditLog",
    "note": "Permissions, retention and tenant settings affect available events."
  },
  ".NET Assembly Metadata Parser": {
    "input": "Raw PE .exe, .dll or .sys bytes",
    "source": "Suspect executable from disk, memory dump extraction, quarantine or malware sample",
    "acquire": "FTK Imager, PE-sieve, Volatility extraction, or copy original sample",
    "note": "Signature inspection is not cryptographic trust-chain validation. Use sigcheck/osslsigncode for independent comparison."
  },
  ".NET User String Extractor": {
    "input": "Raw PE .exe, .dll or .sys bytes",
    "source": "Suspect executable from disk, memory dump extraction, quarantine or malware sample",
    "acquire": "FTK Imager, PE-sieve, Volatility extraction, or copy original sample",
    "note": "Signature inspection is not cryptographic trust-chain validation. Use sigcheck/osslsigncode for independent comparison."
  },
  "NTFS Alternate Data Streams Analyzer": {
    "input": "NTFS $MFT bytes or individual FILE record (inspect operation expectations)",
    "source": "NTFS volume metadata file: C:\\$MFT",
    "acquire": "Raw image, KAPE, FTK Imager or MFTECmd; volume acquisition with suitable forensic privileges",
    "note": "Do not provide a regular file named MFT exported as CSV; parsers expect raw NTFS bytes."
  },
  "NTFS Attribute Inspector": {
    "input": "NTFS $MFT bytes or individual FILE record (inspect operation expectations)",
    "source": "NTFS volume metadata file: C:\\$MFT",
    "acquire": "Raw image, KAPE, FTK Imager or MFTECmd; volume acquisition with suitable forensic privileges",
    "note": "Do not provide a regular file named MFT exported as CSV; parsers expect raw NTFS bytes."
  },
  "NTFS MFT Parser": {
    "input": "NTFS $MFT bytes or individual FILE record (inspect operation expectations)",
    "source": "NTFS volume metadata file: C:\\$MFT",
    "acquire": "Raw image, KAPE, FTK Imager or MFTECmd; volume acquisition with suitable forensic privileges",
    "note": "Do not provide a regular file named MFT exported as CSV; parsers expect raw NTFS bytes."
  },
  "OpenSave MRU Analyzer": {
    "input": "Exported registry data / values",
    "source": "NTUSER.DAT: Explorer\\ComDlg32\\OpenSavePidlMRU; Explorer\\RecentDocs",
    "acquire": "RECmd / Registry Explorer, or KAPE",
    "note": "Confirm input format supported; this is not a full registry transaction-log parser."
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
    "input": "Raw PE .exe, .dll or .sys bytes",
    "source": "Suspect executable from disk, memory dump extraction, quarantine or malware sample",
    "acquire": "FTK Imager, PE-sieve, Volatility extraction, or copy original sample",
    "note": "Signature inspection is not cryptographic trust-chain validation. Use sigcheck/osslsigncode for independent comparison."
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
    "input": "Exported Windows event XML or normalized JSON/JSONL",
    "source": "Security.evtx; Microsoft-Windows-Sysmon%4Operational.evtx; PowerShell/Operational; TerminalServices logs; Defender Operational",
    "acquire": "wevtutil qe <channel> /f:xml; Get-WinEvent | ConvertTo-Json; hayabusa or Chainsaw for EVTX-to-JSON",
    "note": "These analyzers are not binary EVTX decoders: export structured events first."
  },
  "RDP Activity Analyzer": {
    "input": "Exported Windows event XML or normalized JSON/JSONL",
    "source": "Security.evtx; Microsoft-Windows-Sysmon%4Operational.evtx; PowerShell/Operational; TerminalServices logs; Defender Operational",
    "acquire": "wevtutil qe <channel> /f:xml; Get-WinEvent | ConvertTo-Json; hayabusa or Chainsaw for EVTX-to-JSON",
    "note": "These analyzers are not binary EVTX decoders: export structured events first."
  },
  "RecentDocs Analyzer": {
    "input": "Exported registry data / values",
    "source": "NTUSER.DAT: Explorer\\ComDlg32\\OpenSavePidlMRU; Explorer\\RecentDocs",
    "acquire": "RECmd / Registry Explorer, or KAPE",
    "note": "Confirm input format supported; this is not a full registry transaction-log parser."
  },
  "Remove EXIF": {
    "input": "JPEG with EXIF tags",
    "source": "Captured JPEG image",
    "acquire": "Acquire original JPEG unmodified",
    "note": "Removing EXIF is a transformation, not a forensic evidence-preservation action."
  },
  "Run Key Analyzer": {
    "input": "Exported registry data JSON/text",
    "source": "HKLM/HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\Run and RunOnce",
    "acquire": "RECmd, reg query or Autoruns export",
    "note": "Include hive origin and user SID when preserving evidence context."
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
    "input": "Registry artifact (USRCLASS.DAT or compatible export)",
    "source": "%LOCALAPPDATA%\\Microsoft\\Windows\\UsrClass.dat; NTUSER.DAT",
    "acquire": "KAPE, SBECmd or Registry Explorer",
    "note": "ShellBags reconstruction requires interpreting BagMRU/BagMRU recursively; partial support."
  },
  "ShimCache Parser": {
    "input": "Text, JSON or raw evidence bytes as supported by the operation",
    "source": "Consult the evidence source and operation-specific parser implementation",
    "acquire": "Forensic imaging, KAPE, FTK Imager or source-native exporter",
    "note": "Validate with a specialized tool before relying on output."
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
    "input": "Exported Windows event XML or normalized JSON/JSONL",
    "source": "Security.evtx; Microsoft-Windows-Sysmon%4Operational.evtx; PowerShell/Operational; TerminalServices logs; Defender Operational",
    "acquire": "wevtutil qe <channel> /f:xml; Get-WinEvent | ConvertTo-Json; hayabusa or Chainsaw for EVTX-to-JSON",
    "note": "These analyzers are not binary EVTX decoders: export structured events first."
  },
  "Timeline Builder": {
    "input": "JSON / JSONL records with timestamps",
    "source": "Derived records from multiple evidence sources",
    "acquire": "Normalize timestamp fields to ISO 8601 UTC before import",
    "note": "Record source and original time zone."
  },
  "UserAssist Decoder": {
    "input": "Exported UserAssist ROT13 registry values / binary payload",
    "source": "NTUSER.DAT: Software\\Microsoft\\Windows\\CurrentVersion\\Explorer\\UserAssist",
    "acquire": "RECmd or Registry Explorer; collect NTUSER.DAT with KAPE",
    "note": "Value interpretation varies with Windows generation."
  },
  "USN Journal Parser": {
    "input": "Raw USN_RECORD records; not ordinary Windows event logs",
    "source": "NTFS metadata: C:\\$Extend\\$UsnJrnl:$J",
    "acquire": "KAPE, RawCopy, NTFS image or fsutil usn readjournal (capture output as appropriate)",
    "note": "Select $J data stream, not $Max."
  },
  "Windows Event ID Explainer": {
    "input": "Text containing Windows event IDs",
    "source": "Security / System / PowerShell / Sysmon event IDs",
    "acquire": "Copy IDs or list from events; Windows Event Viewer",
    "note": "Maps known IDs; not full event parser."
  },
  "Windows EVTX Metadata Inspector": {
    "input": "Raw .evtx file",
    "source": "C:\\Windows\\System32\\winevt\\Logs\\*.evtx",
    "acquire": "wevtutil epl Security Security.evtx; or KAPE/FTK Imager",
    "note": "Only container/chunk metadata and strings; does not decode EVTX BinXML records. Export event XML/JSON for event analyzers."
  },
  "Windows LNK Parser": {
    "input": "Raw .lnk binary file",
    "source": "%APPDATA%\\Microsoft\\Windows\\Recent\\*.lnk; Desktop and Startup folders",
    "acquire": "KAPE, FTK Imager or copy a .lnk file",
    "note": "Import the LNK bytes, not its target executable."
  },
  "Windows Logon Analyzer": {
    "input": "Exported Windows event XML or normalized JSON/JSONL",
    "source": "Security.evtx; Microsoft-Windows-Sysmon%4Operational.evtx; PowerShell/Operational; TerminalServices logs; Defender Operational",
    "acquire": "wevtutil qe <channel> /f:xml; Get-WinEvent | ConvertTo-Json; hayabusa or Chainsaw for EVTX-to-JSON",
    "note": "These analyzers are not binary EVTX decoders: export structured events first."
  },
  "Windows Prefetch Parser": {
    "input": "Raw .pf, uncompressed SCCA",
    "source": "C:\\Windows\\Prefetch\\*.pf",
    "acquire": "KAPE or FTK Imager; copy with administrator/forensic privileges. Windows 10/11 Prefetch often uses MAM compression.",
    "note": "If MAM compressed, decompress with the appropriate XPRESS Huffman implementation first; avoid modifying original evidence."
  },
  "Windows Recycle Bin Parser": {
    "input": "Raw $I metadata companion file",
    "source": "C:\\$Recycle.Bin\\<SID>\\$I*",
    "acquire": "KAPE/FTK Imager (preserve $I and $R pairs)",
    "note": "Import $I metadata file rather than recycled $R content."
  },
  "Windows Registry Hive Inspector": {
    "input": "Raw binary registry hive",
    "source": "C:\\Windows\\System32\\config\\SYSTEM, SOFTWARE, SAM, SECURITY; user NTUSER.DAT",
    "acquire": "KAPE/FTK Imager; reg save HKLM\\SOFTWARE SOFTWARE.hiv on a live system",
    "note": "Registry hives in use generally require shadow-copy or forensic acquisition; capture associated LOG1/LOG2."
  },
  "Windows Service Installation Detector": {
    "input": "Exported Windows event XML or normalized JSON/JSONL",
    "source": "Security.evtx; Microsoft-Windows-Sysmon%4Operational.evtx; PowerShell/Operational; TerminalServices logs; Defender Operational",
    "acquire": "wevtutil qe <channel> /f:xml; Get-WinEvent | ConvertTo-Json; hayabusa or Chainsaw for EVTX-to-JSON",
    "note": "These analyzers are not binary EVTX decoders: export structured events first."
  },
  "Windows Services Registry Analyzer": {
    "input": "Exported Services registry data JSON/text",
    "source": "SYSTEM\\ControlSet00x\\Services",
    "acquire": "RECmd, Registry Explorer, Autoruns or reg query",
    "note": "Service control set selection depends on SYSTEM\\Select."
  },
  "Windows Timeline ActivitiesCache Parser": {
    "input": "Raw SQLite ActivitiesCache.db",
    "source": "%LOCALAPPDATA%\\ConnectedDevicesPlatform\\<account>\\ActivitiesCache.db",
    "acquire": "KAPE or FTK Imager; collect -wal and -shm when present",
    "note": "Offline SQLite may be missing recent records without WAL."
  },
  "YARA Rules": {
    "input": "Text, JSON or raw evidence bytes as supported by the operation",
    "source": "Consult the evidence source and operation-specific parser implementation",
    "acquire": "Forensic imaging, KAPE, FTK Imager or source-native exporter",
    "note": "Validate with a specialized tool before relying on output."
  },
  "Zone.Identifier ADS Parser": {
    "input": "Zone.Identifier stream text",
    "source": "NTFS alternate stream on downloaded file",
    "acquire": "PowerShell Get-Content -Stream Zone.Identifier -Path <file>",
    "note": "ADS must be extracted explicitly; regular file download may lose it."
  }
};
