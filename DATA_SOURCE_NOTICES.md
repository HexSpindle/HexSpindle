# HexSpindle — Public IP intelligence feed notices

These notices concern **downloaded feed data**, not third-party JavaScript packages. The
new HexSpindle JavaScript and feed-builder code is SPDX `MIT` and uses only browser
and Python standard libraries.


## SANS Internet Storm Center / DShield

**Attribution:** SANS Technology Institute, Internet Storm Center — https://isc.sans.edu

Feed sources:

- https://isc.sans.edu/feeds/threatintel.txt
- https://feeds.dshield.org/feeds/daily_sources
- https://isc.sans.edu/api/intelfeed?json

The SANS feed documentation allows attributed use and says **do not resell the data**.
See https://isc.sans.edu/feeds_doc.html. Data returned by particular API endpoints
may have additional terms; consult https://isc.sans.edu/api/. If you redistribute
any derived feed, retain SANS attribution and comply with applicable API licensing.

Daily Sources are observations, **not** a validated IP blocklist. Absence of an IP
from the feed is **not** evidence that it is benign. Publication time and observation
date can differ. Historic individual-IP API fields are **not** fully available in
these downloadable feeds.

## RIR public extended delegation statistics

Contains only coarse resource allocation statistics. These public files are
**not** ARIN Bulk Whois and do **not** provide reassignment details or contact
information.

- ARIN: https://ftp.arin.net/pub/stats/arin/delegated-arin-extended-latest
- APNIC: https://ftp.apnic.net/stats/apnic/delegated-apnic-extended-latest
- RIPE NCC: https://ftp.ripe.net/pub/stats/ripencc/delegated-ripencc-extended-latest
- LACNIC: https://ftp.lacnic.net/pub/stats/lacnic/delegated-lacnic-extended-latest
- AFRINIC: https://ftp.afrinic.net/stats/afrinic/delegated-afrinic-extended-latest

IANA public RDAP bootstrap source: https://data.iana.org/rdap/

The local allocation match is **not** authoritative proof of the present end-user,
sub-assignee, route origin, abuse contact or WHOIS registrant. For that information,
use the existing detailed RDAP mode.

## Provenance

The public site publishes `data/feeds/manifest.json` with per-feed original URL,
source retrieval date, HTTP `Last-Modified` when provided, byte count, and SHA-256
of the full uncompressed response. The manifest's `generated_at` is a separate
publication timestamp. Data is served over HTTPS from the same origin.

## Security and data retention

Downloaded records may be cached in the visitor's browser (IndexedDB), subject to
browser storage quotas. No input IP list is sent to SANS or ARIN by **local**
lookup modes. Opt-in **live** modes still send IP queries to the relevant providers.
MD5 from the ARIN publisher is checked if available for download, while SHA-256 is
used for HexSpindle's own content manifest. SHA-256 of a downloaded response
attests to that response, not the completeness of a provider's underlying database.


## MaxMind GeoLite2 City (optional; default: disabled)

GeoLite2 data created by MaxMind, available from https://www.maxmind.com.
The `IP GeoLocation` operation always permits users to load their own licensed MMDB files.
The Pages workflow validates GeoLite2 City on Tuesday/Friday with configured secrets,
but **does not publish any database unless** the repository variable
`MAXMIND_PUBLIC_MIRROR_ALLOWED` is `true` AND the maintainer has confirmed that the
applicable MaxMind redistribution license permits public delivery of the full MMDB.
A free account/download license by itself is not enough. MaxMind describes separate
commercial redistribution licensing: https://support.maxmind.com/knowledge-base/articles/commercial-license-for-geolite

When authorized, the feed manifest exposes the actual MMDB `database_type`, `build_epoch`
as the database's updated date, and its separate download retrieval time. Subsequent
ordinary site deployments carry the last published version forward until an authorized
new release is available. Turning the publishing variable off removes the copy from
the next generated Pages artifact; prior browser or CDN copies cannot be remotely revoked.


## Bundled reference datasets (offline operation data)

Unlike the feeds above, the following datasets are distilled once from public sources and **bundled** into the
site as lazily loaded modules under `modules/forensics/`. They are loaded only when the corresponding operation
is used, and nothing is fetched at runtime. Regenerate them with the scripts in `tools/` (see each module header)
to refresh.

### MITRE ATT&CK® for Enterprise — `modules/forensics/_attack_data.mjs`

**Attribution:** © The MITRE Corporation. This product uses the MITRE ATT&CK® knowledge base.
ATT&CK® is a registered trademark of The MITRE Corporation.

Source: the official ATT&CK STIX bundle at https://github.com/mitre/cti
(`enterprise-attack/enterprise-attack.json`). The bundled module contains a distilled subset per technique
(ID, name, tactics, platforms, sub-technique flag, a trimmed description, and mitigation names); it is **not**
the complete STIX dataset. Use is governed by the ATT&CK Terms of Use:
https://attack.mitre.org/resources/legal-and-branding/terms-of-use/ . Retain MITRE attribution in any
redistribution. The data is a point-in-time snapshot (recorded in the module's `version` export); consult
attack.mitre.org for the authoritative, current content.

### IEEE MAC Address Block registry (OUI) — `modules/forensics/_oui_data.mjs`

**Attribution:** Vendor-prefix data compiled by the Wireshark project in its `manuf` file
(https://www.wireshark.org/download/automated/data/manuf), which is assembled from the public IEEE registries
(MA-L, MA-M, MA-S) at https://standards-oui.ieee.org/ . The bundled module keeps only the prefix → vendor
mapping (short tag and registrant name), split by block size for longest-prefix matching. Wireshark's `manuf`
is distributed under the GPL-2.0-or-later; the underlying IEEE registry data is public. This is a point-in-time
snapshot; consult the IEEE registry for authoritative, current assignments.
