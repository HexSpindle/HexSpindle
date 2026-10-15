# HexSpindle desktop packages

The HexSpindle desktop packages run the HexSpindle web app on your own computer. Each download is a small local
web server, the **launcher**, with the complete, tested website built in. The launcher serves it at
`http://127.0.0.1:47800/` (an address only your computer can reach), opens it in your default browser, and stops by
itself shortly after you close the last HexSpindle tab. Nothing needs to be installed besides the download itself.

Downloads are on the [releases page](https://github.com/HexSpindle/HexSpindle/releases).

| System | Download |
| --- | --- |
| Windows 10 or 11, x64 (most PCs) | `HexSpindle-<version>-windows-x64.exe` |
| Windows 11 on ARM | `HexSpindle-<version>-windows-arm64.exe` |
| macOS 13 Ventura or newer, Apple Silicon and Intel | `HexSpindle-<version>-macos-universal.zip` |
| Ubuntu, Debian, Linux Mint (x64 / ARM64) | `HexSpindle-<version>-linux-x64.deb` / `-linux-arm64.deb` |
| Fedora, RHEL, openSUSE (x64 / ARM64) | `HexSpindle-<version>-linux-x64.rpm` / `-linux-arm64.rpm` |
| Any Linux (x64 / ARM64) | `HexSpindle-<version>-linux-x64.tar.gz` / `-linux-arm64.tar.gz` |
| Source, to run or build it yourself | `HexSpindle-<version>-source.zip` / `.tar.gz` |

## Installing and first start

**Windows.** Download the `.exe` and run it; it is a single portable file that you can keep anywhere. The
packages are not code-signed yet, so SmartScreen may show "Windows protected your PC". Choose **More info**, then
**Run anyway**. Windows asks only the first time.

**macOS.** Open the `.zip` (Safari does this for you) and drag **HexSpindle.app** to Applications. The app is
not notarized by Apple yet, so the first start shows a message that macOS cannot verify it. Open
**System Settings → Privacy & Security**, scroll down, choose **Open Anyway** next to HexSpindle, and confirm.
From then on it opens normally. HexSpindle has no window or Dock icon of its own; it lives in its browser tab.

**Linux.** Install a package with `sudo apt install ./HexSpindle-<version>-linux-x64.deb` or
`sudo dnf install ./HexSpindle-<version>-linux-x64.rpm`, then start **HexSpindle** from the applications menu or run
`hexspindle`. Or extract the `.tar.gz` anywhere and run `./hexspindle`. The browser is opened with `xdg-open`.

To uninstall, delete the `.exe` or the app, or run `sudo apt remove hexspindle` / `sudo dnf remove hexspindle`.

## Using it

- **One address.** HexSpindle always uses `http://127.0.0.1:47800/` (or the next free port up to 47809 if another
  program has that one). Your recipes and settings are kept in the browser's storage for that address, so they
  are there the next time you start it. A bookmark to the address works while HexSpindle is running.
- **Starting it again** while it runs opens another tab on the running copy.
- **Stopping.** It exits about 15 seconds after the last HexSpindle tab closes, or when the browser quits.
- **Offline.** Everything works offline except operations that use threat-intelligence feeds. Those download
  their data from hexspindle.github.io when needed, as the website does.
- **Problems.** Each run writes a short log to `HexSpindle\launcher.log` in your cache folder: `%LocalAppData%` on
  Windows, `~/Library/Caches` on macOS, `~/.cache` on Linux. If it cannot start, it says why in a message box.

## Privacy and usage analytics

Your data is processed in your browser, on your computer, and is never sent anywhere by HexSpindle. Like the
public website, the app sends **anonymous usage analytics**: which operations are used, whether they succeed and
how long they take, never inputs, outputs, files, recipe arguments or search text. The
[privacy notice](../analytics/privacy.html), linked from the app's footer, describes exactly what is collected.
Analytics are on by default. To turn them off, do any of these:

- click **Opt out** in the app's footer (remembered by that browser),
- turn on Global Privacy Control or Do Not Track in your browser, or
- start HexSpindle with `--no-analytics` (see below).

## Command-line options

Start HexSpindle from a terminal to pass options: `HexSpindle-<version>-windows-x64.exe --no-analytics` in
PowerShell, `/Applications/HexSpindle.app/Contents/MacOS/HexSpindle --no-analytics` on macOS, or
`hexspindle --no-analytics` on Linux. (On Windows, append `| Write-Output` to see the output of `--version` or
`--help` before the prompt returns.)

```
--no-analytics              turn off the app's anonymous usage analytics
--port <n>                  use this port (default 47800, or the next free one up to 47809)
--no-browser                do not open a browser tab; just print the address
--keep-running              keep running after the last HexSpindle tab is closed (stop with Ctrl+C)
--site <folder>             serve this folder (a HexSpindle source folder or built site) instead of the built-in copy
--idle-timeout <duration>   for tabs that cannot hold a connection: treat one as closed after this long (default 30m)
--exit-grace <duration>     wait this long after the last tab closes before exiting (default 15s)
--first-connect-timeout <duration>
                            exit if no tab opens the app within this time (default 5m)
--feeds-upstream <url>      site that feed data is fetched from (default https://hexspindle.github.io)
--version                   print the version (and which tested site build is inside) and exit
--licenses                  print the launcher's license notices and exit
```

A different `--port` is a different address, so it has its own, separate saved data.

## Verifying a download

`SHA256SUMS.txt` on each release lists the SHA-256 of every file (`sha256sum --check --ignore-missing
SHA256SUMS.txt` on Linux, `shasum -a 256 <file>` on macOS, `Get-FileHash <file>` on Windows). Every file also has
a [build-provenance attestation](https://docs.github.com/actions/security-for-github-actions/using-artifact-attestations)
that ties it to the workflow run that built it from the tagged commit:

```
gh attestation verify HexSpindle-<version>-windows-x64.exe --repo HexSpindle/HexSpindle
```

## How it works

- **Same site as the website.** The packages contain exactly the site build that passed the browser tests in CI
  (the build pipeline checks its SHA-256). Files are stored compressed and served byte for byte.
- **What the launcher changes.** It adds two tags to `index.html`: a marker that tells the analytics client the
  page is served by the launcher, and a small script that keeps a WebSocket open to the launcher while the tab is
  open. When the tab closes, or the browser quits or crashes, the socket closes and the launcher knows. With
  `--no-analytics` it also removes the analytics endpoint from `index.html`.
- **Local only.** It listens on `127.0.0.1`, answers only requests addressed to its own origin (which defeats DNS
  rebinding), refuses tab sockets and session requests from other sites, sends `nosniff`, `no-referrer` and
  `no-store` headers, and sets content types itself instead of trusting the operating system (Windows often maps
  `.js` to `text/plain`, which would stop the app from loading).
- **Feeds.** Requests for `/data/feeds/*` are forwarded to `https://hexspindle.github.io/data/feeds/*`, because the
  feed files are refreshed daily by the website and are not part of either repository.

## For maintainers

### Release process

The `HexSpindle CI` workflow builds and tests the packages on every pull request and push, and publishes them
only for version tags:

1. `browser-smoke-test` tests the site and the built site, and uploads the tested build as the `tested-site`
   artifact.
2. `desktop-build` checks that artifact's bundle SHA-256 against the tested one, runs `go vet` and
   `go test -race`, and runs `desktop/build.sh` to build every package (`desktop-packages` artifact).
3. `desktop-test` runs `tools/ci-desktop-launcher.mjs` against each package on its own system: Windows x64 and
   ARM64, macOS (also `codesign --verify` and `lipo`), Linux x64 and ARM64 (also installs the `.deb`). On Windows x64
   and Linux x64 it also drives the app in Chromium. `desktop-source-test` rebuilds the site from the source
   package, checks that it produces the tested bundle, and tests a launcher compiled from it.
4. For a tag `v*`, `desktop-release` attests the build provenance of every file and publishes a GitHub release.
   Tags with a suffix (`v1.2.0-rc.1`) become pre-releases.

To publish a release:

```
git tag v1.0.0
git push origin v1.0.0
```

Pull requests and branch pushes stop after step 3, and their packages can be downloaded from the workflow run as
the `desktop-packages` artifact (versioned `0.0.0-dev.<run number>`). The website deployment is unchanged and does
not wait for the packages.

**Analytics collector.** The packages send analytics from the origin `http://127.0.0.1:<port>` (47800–47809 by
default, any port with `--port`). The collector must accept that origin in its CORS policy for the
`/v1/events` and `/v1/restricted` routes, as it does for `https://hexspindle.github.io`, or browsers reject
the requests and no events from the packages arrive.

### Building locally

You need Go (the version in `desktop/go.mod`), Node.js 24 and bash (Git Bash on Windows):

```
cd tools && npm ci && node build-site.mjs --out ../dist && cd ..
bash desktop/build.sh --dist dist --out packages --version 1.0.0
node tools/ci-desktop-launcher.mjs --bin packages/HexSpindle-1.0.0-windows-x64.exe --dist dist --browser
```

Set `RCODESIGN` to an [rcodesign](https://github.com/indygreg/apple-platform-rs/releases) binary to sign the macOS
app; macOS refuses to run unsigned code on Apple Silicon. For day-to-day work on the launcher, serve the source
tree directly: `cd desktop && go run ./launcher --site .. --keep-running`.

### Layout

| Path | Purpose |
| --- | --- |
| `launcher/` | The launcher (`main.go` options and startup, `server.go` HTTP serving, `session.go` and `socket.go` tab tracking, `platform_*.go` browser and dialogs) |
| `launcher/winres/` | Windows icon, manifest and version information (compiled by go-winres in `build.sh`) |
| `launcher/site/` | Filled with the site by `build.sh` before compiling; only `.placeholder` is committed |
| `internal/sitehtml/` | The `index.html` changes, shared by the launcher and `prepare-site` |
| `tools/prepare-site/` | Copies and compresses the tested site into `launcher/site/` |
| `tools/makefat/`, `tools/pack/` | Universal macOS binary; reproducible `.zip` and `.tar.gz` |
| `packaging/` | Icons, macOS `Info.plist`, Linux `.desktop` file and nfpm config, source-package README, release notes |
| `build.sh` | Builds every package and `SHA256SUMS.txt` |
