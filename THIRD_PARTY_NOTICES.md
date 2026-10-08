# HexSpindle — Third-Party Notices

This document attributes third-party software and embedded data distributed within HexSpindle. HexSpindle's own original code is offered under the MIT license in the repository root `LICENSE`; that license **does not relicense third-party code**. Each third-party component continues under its applicable license. Versions and attributions below are based on identified module headers and a source inspection on 2026-10-08, and should be checked against exact upstream release artifacts when rebuilding bundles.

## License texts

Common license conditions appear in [`licenses/`](licenses/): [`MIT.txt`](licenses/MIT.txt), [`ISC.txt`](licenses/ISC.txt), [`BSD-2-Clause.txt`](licenses/BSD-2-Clause.txt), [`BSD-3-Clause.txt`](licenses/BSD-3-Clause.txt), [`Apache-2.0.txt`](licenses/Apache-2.0.txt), [`GPL-3.txt`](licenses/GPL-3.txt) and [`LGPL-3.txt`](licenses/LGPL-3.txt). Copyright lines in the component entries below accompany the relevant common license text; where a bundle includes its own upstream copyright/license banners, **retain those original banners as well**. An SPDX name by itself is not a substitute for the complete applicable license conditions. Original upstream package license files/NOTICE files may contain additional author-specific language which must also be preserved.

> **Release qualification.** This is a comprehensive *initial inventory*, not a certification that all upstream notices were obtained. The Tesseract.js 7.0.0 generated-license sidecar is now included; however, mixed-bundle transitive notices, exact OpenPGP.js corresponding-source instructions, and some copyright holders/revisions still require upstream artifact verification. These are flagged below and under [Before publishing a release](#before-publishing-a-release). Do not represent this file as a fully verified dependency SBOM or legal sign-off.

## Third-party components (included source/bundles)

### 1. `modules/code_tidy/_escodegen.mjs`

- **Upstream:** [Escodegen; Esprima; estraverse; esutils; source-map](https://github.com/estools/escodegen)
- **Version/build:** 2.1.0; 4.0.1; 5.3.0; 2.0.3; 0.6.1
- **License(s):** BSD-2-Clause; BSD-3-Clause
- **Copyright/attribution:** Respective original project copyright holders
- **Changes and additional notices:** Bundle contains multiple upstream projects; retain each upstream notice.

### 2. `modules/code_tidy/_highlight.mjs`

- **Upstream:** [highlight.js](https://github.com/highlightjs/highlight.js)
- **Version/build:** 11.12.0
- **License(s):** BSD-3-Clause
- **Copyright/attribution:** Copyright (c) 2006 Ivan Sagalaev
- **Changes and additional notices:** Full build; confirm any nested upstream notices from the original distribution.

### 3. `modules/code_tidy/_sql_formatter.mjs`

- **Upstream:** [sql-formatter](https://github.com/sql-formatter-org/sql-formatter)
- **Version/build:** 15.9.0
- **License(s):** MIT
- **Copyright/attribution:** Copyright (c) 2016–2020 ZeroTurnaround LLC; 2020–present sql-formatter-org
- **Changes and additional notices:** Includes transitive Nearley/parser packages; copy notices from exact build dependencies.

### 4. `modules/code_tidy/_terser.mjs`

- **Upstream:** [Terser; Acorn; @jridgewell/source-map and related packages](https://github.com/terser/terser)
- **Version/build:** 5.51.2; exact transitive versions in bundle
- **License(s):** BSD-2-Clause; MIT
- **Copyright/attribution:** Respective upstream authors and contributors
- **Changes and additional notices:** Bundled dependencies each retain their own notices.

### 5. `modules/code_tidy/_words.js`

- **Upstream:** [Lodash-derived word/deburr helpers](https://github.com/lodash/lodash)
- **Version/build:** Lodash version not confirmed
- **License(s):** MIT
- **Copyright/attribution:** Copyright OpenJS Foundation and other contributors; based in part on Underscore.js contributors
- **Changes and additional notices:** Derivative identification based on source structure; verify exact originating version.

### 6. `modules/code_tidy/_vkbeautify.js`

- **Upstream:** [vkBeautify](https://github.com/vkiryukhin/vkBeautify)
- **Version/build:** Version not established
- **License(s):** MIT
- **Copyright/attribution:** Copyright (c) 2012 Vadim Kiryukhin
- **Changes and additional notices:** Port/adaptation.

### 7. `modules/compression/_brotli.js`

- **Upstream:** [foliojs/brotli.js; Google Brotli](https://github.com/foliojs/brotli.js)
- **Version/build:** 1.3.3; Google decoder/encoder revisions not determined
- **License(s):** MIT; Apache-2.0
- **Copyright/attribution:** Copyright 2013 Google Inc.; foliojs and contributors
- **Changes and additional notices:** Google Apache headers are partly embedded; preserve those notices.

### 8. `modules/compression/_fzstd.mjs`

- **Upstream:** [fzstd](https://github.com/101arrowz/fzstd)
- **Version/build:** 0.1.1
- **License(s):** MIT
- **Copyright/attribution:** Copyright (c) 2020 Arjun Barrett
- **Changes and additional notices:** Vendored with header.

### 9. `modules/compression/_lzstring.js`

- **Upstream:** [LZ-String](https://github.com/pieroxy/lz-string)
- **Version/build:** Version not established
- **License(s):** MIT
- **Copyright/attribution:** Copyright (c) 2013 Pieroxy
- **Changes and additional notices:** Adapted implementation.

### 10. `modules/data_format/_amf_lib.mjs`

- **Upstream:** [@astronautlabs/amf; @astronautlabs/bitstream; reflect-metadata; browser buffer and ieee754](https://github.com/astronautlabs)
- **Version/build:** 0.0.6; 4.2.2; other versions unverified
- **License(s):** MIT; Apache-2.0; BSD-3-Clause
- **Copyright/attribution:** Copyright (c) 2021–2022 Astronaut Labs LLC; Microsoft; Feross Aboukhadijeh; other respective holders
- **Changes and additional notices:** A composite bundle; exact upstream copyright/license notices for all transitive dependencies must be preserved.

### 11. `modules/data_format/_protobufjs.mjs`

- **Upstream:** [protobufjs; @protobufjs helpers; long.js](https://github.com/protobufjs/protobuf.js)
- **Version/build:** 8.8.0; long 5.3.2
- **License(s):** BSD-3-Clause; Apache-2.0
- **Copyright/attribution:** Copyright (c) 2016 Daniel Wirtz; 2009 The Closure Library Authors; 2020 Daniel Wirtz / the long.js Authors
- **Changes and additional notices:** Some long.js Apache notices retained inline.

### 12. `modules/date_time/_moment_tz_data.mjs`

- **Upstream:** [moment-timezone packed data; IANA time zone data](https://github.com/moment/moment-timezone)
- **Version/build:** 0.6.4; tzdb 2026d
- **License(s):** MIT; underlying time-zone data terms vary
- **Copyright/attribution:** Copyright JS Foundation and contributors (moment-timezone)
- **Changes and additional notices:** Verify separate upstream database notices relevant to included tzdb data.

### 13. `modules/date_time/_momentfmt.js`

- **Upstream:** [Moment.js/Moment-Timezone derived parser and formatter](https://github.com/moment/moment)
- **Version/build:** Moment 2.x patterns
- **License(s):** MIT
- **Copyright/attribution:** Copyright JS Foundation and other contributors
- **Changes and additional notices:** Adapted for HexSpindle.

### 14. `modules/forensics/_libyara.mjs`

- **Upstream:** [libyara-wasm; VirusTotal YARA](https://github.com/mattnotmitt/libyara-wasm)
- **Version/build:** 1.2.1; embedded libyara version not verified
- **License(s):** ISC; Apache-2.0
- **Copyright/attribution:** Copyright 2019 Matt Coomber; VirusTotal and YARA contributors
- **Changes and additional notices:** Precompiled WASM embedded; exact source/build and dependency attribution must be preserved.

### 15. `modules/hashing/_hashes_lib.mjs`

- **Upstream:** [crypto-api; crypto-gost-js](https://github.com/nf404/crypto-api)
- **Version/build:** crypto-api 0.8.5; crypto-gost-js version unverified
- **License(s):** MIT
- **Copyright/attribution:** Copyright nf404 and respective crypto-gost-js copyright holders
- **Changes and additional notices:** Bundled/ported hash implementations.

### 16. `modules/multimedia/_d3.mjs`

- **Upstream:** [D3 and subpackages](https://github.com/d3/d3)
- **Version/build:** 7.9.0
- **License(s):** ISC
- **Copyright/attribution:** Copyright 2010–2023 Mike Bostock and D3 contributors
- **Changes and additional notices:** Subpackage attribution and exact versions vary.

### 17. `modules/multimedia/_d3_hexbin.mjs`

- **Upstream:** [d3-hexbin](https://github.com/d3/d3-hexbin)
- **Version/build:** 0.2.2
- **License(s):** BSD-3-Clause
- **Copyright/attribution:** Copyright 2017 Mike Bostock
- **Changes and additional notices:** Wrapped for ESM.

### 18. `modules/multimedia/_geodesy.mjs`

- **Upstream:** [geodesy; ngeohash](https://github.com/chrisveness/geodesy)
- **Version/build:** 1.1.3; 0.6.4
- **License(s):** MIT
- **Copyright/attribution:** Copyright Chris Veness; Copyright Sun Ning
- **Changes and additional notices:** Combined ESM bundle.

### 19. `modules/multimedia/_img_codecs.mjs`

- **Upstream:** [bmp-ts; jpeg-js; utif2; buffer; ieee754; Jimp-derived code](https://github.com/jpeg-js/jpeg-js)
- **Version/build:** 1.0.9; 0.4.4; 4.1.0; 6.0.3; other versions unverified
- **License(s):** MIT; BSD-3-Clause
- **Copyright/attribution:** Respective upstream copyright holders; Feross Aboukhadijeh for buffer/ieee754
- **Changes and additional notices:** Mixed-license bundle; retain all component copyright/terms from exact distribution.

### 20. `modules/multimedia/_jimp.js`

- **Upstream:** [Jimp; tinycolor2](https://github.com/jimp-dev/jimp)
- **Version/build:** Jimp 1.6; tinycolor2 version unverified
- **License(s):** MIT
- **Copyright/attribution:** Jimp contributors; Brian Grinstead and other tinycolor2 contributors
- **Changes and additional notices:** Adapted/ported image primitives.

### 21. `modules/multimedia/_nodom.mjs`

- **Upstream:** [nodom](https://github.com/pakastin/nodom)
- **Version/build:** 2.4.0
- **License(s):** ISC
- **Copyright/attribution:** Copyright holder as stated in upstream nodom package (not independently confirmed)
- **Changes and additional notices:** Vendor-wrapped UMD.

### 22. `modules/multimedia/_qrimage.js`

- **Upstream:** [qr-image](https://github.com/alexeyten/qr-image)
- **Version/build:** 3.2.0
- **License(s):** MIT
- **Copyright/attribution:** Copyright (c) 2013 Yandex LLC
- **Changes and additional notices:** Adapted matrix and SVG writer.

### 23. `modules/multimedia/_roboto_bmfonts.mjs`

- **Upstream:** [Roboto; Roboto Black; Roboto Mono; Roboto Slab bitmap font data](https://github.com/googlefonts/roboto)
- **Version/build:** Exact font versions unverified
- **License(s):** Apache-2.0 (as declared in source)
- **Copyright/attribution:** Google and respective font contributors
- **Changes and additional notices:** Embedded font bitmaps are redistributed assets; inspect exact source font package for attribution.

### 24. `modules/multimedia/_tesseract.mjs`

- **Upstream:** [Tesseract.js browser ESM build](https://github.com/naptha/tesseract.js)
- **Version/build:** 7.0.0
- **License(s):** Apache-2.0; bundled third-party licenses
- **Copyright/attribution:** Tesseract.js contributors and bundled dependency copyright holders
- **Changes and additional notices:** The Tesseract.js 7.0.0 generated `tesseract.min.js.LICENSE.txt` notice is included verbatim at [`licenses/TESSERACT-BUNDLED-LICENSES.txt`](licenses/TESSERACT-BUNDLED-LICENSES.txt). It identifies regenerator-runtime (MIT). The main Apache-2.0 license remains at [`licenses/Apache-2.0.txt`](licenses/Apache-2.0.txt). Other upstream release-compliance checks remain outstanding as described below.

### 25. `modules/other/_codepage.mjs`

- **Upstream:** [SheetJS codepage; Crown Copyright code-page tables](https://github.com/SheetJS/js-codepage)
- **Version/build:** 1.15.0; table version unverified
- **License(s):** Apache-2.0
- **Copyright/attribution:** SheetJS; Crown Copyright as specified upstream
- **Changes and additional notices:** Embedded encoding tables and compiled code.

### 26. `modules/other/_geodesy.mjs`

- **Upstream:** [Chris Veness geodesy](https://github.com/chrisveness/geodesy)
- **Version/build:** 1.1.3
- **License(s):** MIT
- **Copyright/attribution:** Copyright (c) 2014 Chris Veness; portions (c) 2002–2017 Chris Veness
- **Changes and additional notices:** Original source comments remain in bundle.

### 27. `modules/other/_magic_lib.mjs`

- **Upstream:** [GCHQ CyberChef Magic, Stream, file type and character encoding; gamma; chi-squared](https://github.com/gchq/CyberChef)
- **Version/build:** Upstream CyberChef revisions unverified; gamma 1.0.0; chi-squared 1.1.0
- **License(s):** Apache-2.0; MIT
- **Copyright/attribution:** Crown Copyright 2016–2026 as declared in bundle; individual GCHQ contributors; James Halliday
- **Changes and additional notices:** Modified/adapted CyberChef components; preserve per-component headers and upstream NOTICE if applicable.

### 28. `modules/other/_markdownit.js`

- **Upstream:** [markdown-it](https://github.com/markdown-it/markdown-it)
- **Version/build:** 14.3.2
- **License(s):** MIT
- **Copyright/attribution:** Copyright (c) 2014 Vitaly Puzrin, Alex Kocharin
- **Changes and additional notices:** Vendored UMD.

### 29. `modules/public_key/_noble_curve448.mjs`

- **Upstream:** [@noble/curves; @noble/hashes](https://github.com/paulmillr/noble-curves)
- **Version/build:** 2.4.0; 2.4.0
- **License(s):** MIT
- **Copyright/attribution:** Copyright (c) 2022 Paul Miller
- **Changes and additional notices:** Vendored Ed448/X448 bundle.

### 30. `modules/public_key/_openpgp.mjs`

- **Upstream:** [OpenPGP.js; bundled Noble crypto packages](https://github.com/openpgpjs/openpgpjs/tree/v6.3.2)
- **Version/build:** 6.3.2
- **License(s):** LGPL-3.0-or-later; MIT
- **Copyright/attribution:** OpenPGP.js copyright holders; Paul Miller for Noble components
- **Changes and additional notices:** CRITICAL: include GPL-3.0 and LGPL-3.0 full texts; provide corresponding source, modification info, and applicable LGPL replacement/relinking rights. MIT root license does not relicense OpenPGP.js.

### 31. `modules/public_key/_asn1hex.js`

- **Upstream:** [jsrsasign ASN1HEX helpers and OID/DN data](https://github.com/kjur/jsrsasign)
- **Version/build:** Version unverified
- **License(s):** MIT
- **Copyright/attribution:** Copyright Kenji Urushima and jsrsasign contributors
- **Changes and additional notices:** Adapted portions.

### 32. `modules/public_key/_x509_ext.js`

- **Upstream:** [jsrsasign X509/X509CRL/CSR utilities](https://github.com/kjur/jsrsasign)
- **Version/build:** Version unverified
- **License(s):** MIT
- **Copyright/attribution:** Copyright Kenji Urushima and jsrsasign contributors
- **Changes and additional notices:** Adapted portions.

### 33. `modules/utils/_jsdiff.js`

- **Upstream:** [jsdiff](https://github.com/kpdecker/jsdiff)
- **Version/build:** 9.0.0
- **License(s):** BSD-3-Clause
- **Copyright/attribution:** Copyright (c) 2009–2015 Kevin Decker and jsdiff contributors
- **Changes and additional notices:** Vendored portions for string diff.

### 34. `modules/utils/_xmldom_serialize.js`

- **Upstream:** [@xmldom/xmldom](https://github.com/xmldom/xmldom)
- **Version/build:** Version unverified
- **License(s):** MIT
- **Copyright/attribution:** Original xmldom copyright holders and contributors (see upstream LICENSE)
- **Changes and additional notices:** Derived XML serializer; verify exact origin/version.

## HexSpindle DFIR operations expansion (2026-10-08)

The 68 newly added JavaScript operation wrappers and their shared DFIR parsers under `modules/forensics/` are contributed as original HexSpindle code under the repository MIT license. **No additional third-party JavaScript bundle or binary dependency is included with this expansion.** This section is an internal licensing clarification, not an additional third-party attribution and not an independent verification of the implementation's originality. Existing third-party code and the unresolved notice-verification items in this document remain subject to their own licenses.

## Forensic regression fixture provenance (v7)

The optional test fixture `tools/fixtures/forensics/setuptools-cli-64.exe` is a Windows native PE launcher from the open-source [setuptools](https://github.com/pypa/setuptools) distribution, distributed only as a regression specimen for PE Authenticode image hashing. It is **not run** by CI or the browser. The upstream setuptools project uses the **MIT license**; see `tools/fixtures/forensics/LICENSE.SETUPTOOLS.txt` and the upstream license. All synthetic binary fixtures in this release were generated for the HexSpindle test suite. The published Windows Prefetch samples are **not bundled**; the optional test harness checks their public Git blob hashes before parsing.

## Additional components and data provenance to verify

These files contain substantial standards-derived tables or algorithms. They are **not** designated third-party works solely because an implementation of the standard exists elsewhere; verify their generation or original source before making any third-party ownership claim:

- `modules/language/_encoding_tables.js` — encoding tables (including multibyte mappings)
- `modules/data_format/_html_entities.js` — HTML entity data
- `modules/hashing/_snefru_sbox.js`, `modules/hashing/_whirlpool_tables.js`, `modules/hashing/streebog.js` — hash lookup tables and round constants
- `modules/encryption_encoding/_cast5.js` — CAST5 S-box tables
- `modules/multimedia/_qr.js` — QR error-correction/version tables

Dependency names alone do not prove code copying. If additional files are derived from upstream source, add a specific entry and preserve exact upstream notices.

## OpenPGP.js corresponding source and LGPL compliance

The file `modules/public_key/_openpgp.mjs` retains the OpenPGP.js LGPL banner. OpenPGP.js 6.3.2 source release: <https://github.com/openpgpjs/openpgpjs/tree/v6.3.2>. This is a **source-location reference**, not confirmation that a deployed bundle exactly matches that tag. Ensure that recipients are provided the corresponding source for the exact version and any HexSpindle changes, along with the required notices and an LGPL-compliant ability to modify/replace the library as appropriate to the mode of distribution. The actual obligations depend on the distribution/integration model; consult the LGPLv3 terms and counsel if shipping a combined/minified work. The LGPLv3 and GPLv3 terms are included under `licenses/`.

## Before publishing a release

1. **Tesseract.js:** The original 7.0.0 generated-license sidecar is included at [`licenses/TESSERACT-BUNDLED-LICENSES.txt`](licenses/TESSERACT-BUNDLED-LICENSES.txt) (regenerator-runtime MIT notice). Retain that file and the Apache-2.0 license in every distribution; verify any additional upstream notices if the bundled version or build changes.
2. **Mixed-license bundles:** obtain precise dependency versions, the copyright holder lines, and full upstream license/NOTICE text for bundled transitive packages from the source artifact used to build `_escodegen.mjs`, `_terser.mjs`, `_sql_formatter.mjs`, `_amf_lib.mjs`, `_protobufjs.mjs`, `_img_codecs.mjs`, `_hashes_lib.mjs`, and `_d3.mjs`.
3. **Apache NOTICE files:** determine whether GCHQ CyberChef, Google Brotli, YARA, codepage or any other Apache-2.0 upstream distributions supplied a `NOTICE` file. Preserve notices required for redistributed portions, and prominently identify modifications of Apache-2.0 files.
4. **OpenPGP.js:** document and provide the exact corresponding source and any modifications, verify your LGPLv3 distribution obligations, and ensure recipients can exercise the rights required by that license.
5. **Data and fonts:** verify bundled font versions/licensing, zone data provenance, generated encoding tables, and any non-code notices carried by the upstream datasets.
6. **Retain notices during minification:** ensure production builds preserve headers or provide notices alongside distributed copies; update this manifest whenever dependencies change.

This notice inventory does not grant trademark rights or modify any upstream license.
