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

HexSpindle currently implements **613 operations across all 16 supported categories**.

Operations are added incrementally. Features that have not yet been ported are simply omitted from the operation registry, allowing the rest of the application to remain fully functional.

The **Magic** decoder uses the same registry when evaluating candidate transformations. Unsupported candidates are automatically skipped, which means Magic's decoding coverage expands naturally as new operations are implemented.

| Category | Operations |
|---|---:|
| Encryption / Encoding | 146 |
| Data Format | 78 |
| Hashing | 66 |
| Utils | 61 |
| Public Key | 49 |
| Multimedia | 41 |
| Networking | 51 |
| Compression | 34 |
| Other | 32 |
| Arithmetic / Logic | 31 |
| Code Tidy | 16 |
| Forensics | 16 |
| Extractors | 11 |
| Date / Time | 11 |
| Flow Control | 9 |
| Language | 6 |
| **Total** | **658** |

## Architecture

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

## Client-Side Processing

HexSpindle is designed around local browser execution. Most data transformations are performed entirely in the browser using browser APIs and JavaScript implementations rather than being sent to a remote processing service.

Some operations are intentionally network-enabled. For example, HTTP requests and DNS-over-HTTPS operations contact destinations selected by the user.

The optional **Suggest** feature also connects directly to the Anthropic API when explicitly invoked and requires the user to provide their own API key.

Network access is not required for normal local transformation workflows.

## License

HexSpindle is released under the **MIT License**.

See [LICENSE](LICENSE) for details.
