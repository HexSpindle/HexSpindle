<p align="center">
  <img src="./assets/HexSpindle-Logo.png" alt="HexSpindle" width="520">
</p>
<div align="center">

### Browser-based data transformation and analysis workbench

**Decode · Encode · Transform · Analyze · Inspect**

</div>

---

**HexSpindle** is a browser-based data transformation workbench for decoding, encoding, analysis, forensics, cryptography, compression, and general data manipulation.

The recipe engine, **Magic** speculative decoder, **Compare**, **Batch Processing**, and the **ZIP/archive browser** all execute entirely client-side.

HexSpindle makes extensive use of modern browser capabilities including:

- Web Crypto API
- `CompressionStream` / `DecompressionStream`
- `BigInt`
- `Canvas` / `OffscreenCanvas`
- Native JavaScript implementations of selected algorithms, including MD5, CRC-32, and classical ciphers

No server-side processing is required for normal operation.

**Live application:** [https://hexspindle.github.io/](https://hexspindle.github.io/)

**Contributing:** See the [contribution guidelines](https://github.com/HexSpindle/.github/blob/main/CONTRIBUTING.md).

**Security:** Please report vulnerabilities according to the [security policy](https://github.com/HexSpindle/.github/blob/main/SECURITY.md).

## Operation Coverage

HexSpindle currently implements **742 operations across all 16 supported categories**.

Operations are added incrementally. Features that have not yet been ported are simply omitted from the operation registry, allowing the rest of the application to remain fully functional.

The **Magic** decoder uses the same registry when evaluating candidate transformations. Unsupported candidates are automatically skipped, which means Magic's decoding coverage expands naturally as new operations are implemented.

| Category | Operations |
|---|---:|
| Encryption / Encoding | 146 |
| Forensics | 100 |
| Data Format | 78 |
| Hashing | 66 |
| Utils | 61 |
| Networking | 51 |
| Public Key | 49 |
| Multimedia | 41 |
| Compression | 34 |
| Other | 32 |
| Arithmetic / Logic | 31 |
| Code Tidy | 16 |
| Date / Time | 11 |
| Extractors | 11 |
| Flow Control | 9 |
| Language | 6 |
| **Total** | **742** |
## Architecture

**DFIR validation status:** 100 Forensics operations are available, but **not all are certified for forensic completeness or correctness**. See the [v7 forensic conformance matrix](docs/FORENSICS_CONFORMANCE_V7.md) and [ongoing validation report](docs/FORENSICS_VALIDATION_REPORT.md) for confirmed tests, limitations, evidence gaps and reference-corpus instructions.


HexSpindle is organized around a modular operation registry and a client-side recipe execution engine.

### Core

- **`core/engine.js`**  
  The recipe execution engine. Handles operation sequencing, argument resolution, output-type coercion, and flow-control primitives including `Fork`, `Subsection`, `Merge`, `Jump`, `Conditional Jump`, `Register`, `Label`, `Return`, and `Comment`.

- **`core/registry.js`**  
  Central operation registry and argument-specification helpers. Operations register themselves here so they can be discovered and executed consistently by the recipe engine and other features.

- **`core/magic.js`**  
  Implements the **Magic** speculative decoder. Candidate decoding operations are explored breadth-first and ranked using heuristics such as printable-character ratio, entropy, file signatures, and common-word detection.

- **`core/util.js`**, **`core/codec.js`**, **`core/filetypes.js`**  
  Shared utilities for byte manipulation, text and binary encoding, codec handling, and file-type detection. `core/filetypes.js` also contains the magic-byte signature table used by **Detect File Type** and **Magic**.

### Operations

- **`modules/<category>/`**  
  Operations are grouped by category, with individual operation implementations stored as separate modules.

- **`modules/<category>/_cat.js`**  
  Defines category-level registration and metadata.

This structure keeps operations isolated and makes it straightforward to add, maintain, and test additional transformations.

### User Interface

- **`app.js`**
- **`app.css`**
- **`index.html`**

Together, these files provide the browser UI and application shell, including:

- Recipe builder
- Input and output workspaces
- Save / Load
- Batch processing
- Compare
- Suggest
- Magic decoding
- ZIP/archive browser

## Forensics evidence and validation

The Forensics category includes native-file readers and operations that require exported or normalized evidence. Their supported inputs differ. See the [100-operation acquisition and input guide](docs/FORENSICS_ARTIFACT_GUIDE.md) and the [validation report and known limitations](docs/FORENSICS_VALIDATION_REPORT.md). Raw `.evtx` conversion to event XML/JSON is available via `EVTX to XML` / `EVTX to JSON` before event-focused operations. The conversion is format-limited and must be cross-checked for evidentiary conclusions. SQLite committed WAL snapshots can be reconstructed from a ZIP containing the database and matching -wal file via `SQLite WAL Snapshot (ZIP)` before running browser parsers. Modern checksum-verified Registry HvLE replay is available via Registry Hive Transaction Replay (ZIP), but old DIRT logs and damaged-base recovery remain unsupported. The SQLite Freelist Record Candidates and EVTX Salvage Report operations are explicitly partial or unverified outputs; PE Authenticode Image Hash is NOT signature-trust verification.

### Native Windows Event Log conversion

Use **EVTX to XML** or **EVTX to JSON** on a native `.evtx` file, then add event-focused Forensics operations in your recipe. Example: `EVTX to JSON` → `Windows Logon Analyzer`. The converter supports standard templates and common value types; see [Forensics artifact guide](docs/FORENSICS_ARTIFACT_GUIDE.md) for acquisition notes and limitations. It ignores *wholly zero-filled, unpopulated capacity after the declared chunk range* but still flags structurally corrupt, nonzero chunks. It reports unsupported or corrupted BinXML rather than silently returning incomplete evidence.

### Event hunting and managed-code triage

Use `EVTX to JSON` → `Windows Event Log Summary` or `Windows Event Log Filter` followed by specialized account/group, audit-log integrity, Task Scheduler, process execution, Sysmon persistence, or SMB share analyzers. These operations match source providers as well as event IDs to avoid conflating unrelated channels. `PE CLR Managed Detector` distinguishes native PE files from managed .NET assemblies; an `.exe`/`.dll` extension is not proof of .NET metadata.

## Client-Side Processing

HexSpindle is designed around local browser execution. Most data transformations are performed entirely in the browser using browser APIs and JavaScript implementations rather than being sent to a remote processing service.

Some operations are intentionally network-enabled. For example, HTTP requests and DNS-over-HTTPS operations contact destinations selected by the user.

The optional **Suggest** feature connects directly to Anthropic or OpenAI only when explicitly invoked and requires a user-supplied API key. AI keys are kept in page memory, not persisted by the AI module; reloading the page clears them. When enabled by the user, input or output samples are sent to the selected provider.

Network access is not required for normal local transformation workflows.

## License

HexSpindle's original code is released under the **MIT License**. Vendored third-party components retain their respective licenses.

See [LICENSE](LICENSE) and [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md) for details.
