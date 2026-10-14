# HexSpindle portable desktop launchers

These launchers embed the normal production `dist` website in a Go executable, bind an HTTP server only to `127.0.0.1` on an available port, and open the system browser. No Node.js, Python, or Docker is needed by end users. The browser must already be installed.

## Automatic builds

Every push to `main` builds six executables, downloadable from **Actions → Desktop portable packages → latest run → Artifacts**. PRs build packages for review. Pushing a `v*` tag also publishes the executables under **Releases**, with SHA-256 checksums. Normal pushes do not create public Releases.

## Running

Windows: double-click `HexSpindle-windows-amd64.exe` (or ARM64 variant). Windows may warn about unsigned software.

macOS: in Terminal run `chmod +x HexSpindle-darwin-arm64 && ./HexSpindle-darwin-arm64` (use amd64 for Intel). Unsigned/unnotarized binaries may be blocked by Gatekeeper; signed `.app` packaging is a future improvement.

Linux: `chmod +x HexSpindle-linux-amd64 && ./HexSpindle-linux-amd64` (use arm64 for ARM systems). Requires `xdg-open` to open the browser automatically; otherwise use the printed URL.

To stop: press Ctrl+C in the launcher terminal. The launcher runs only while its process remains alive. `HEXSPINDLE_NO_BROWSER=1` disables browser auto-opening.

## Local build

From repository root:

```sh
(cd tools && npm ci)
node tools/build-site.mjs --out dist
node tools/ci-dist-smoke.mjs --dist dist
rm -rf desktop/launcher/site
mkdir -p desktop/launcher/site
cp -R dist/. desktop/launcher/site/
(cd desktop/launcher && go build -o HexSpindle .)
```

The `desktop/launcher/site` directory contains only a tracked placeholder in Git; CI replaces it with `dist` before building. Do not commit generated site assets into this directory.

## Important

Offline browser-side operations work without internet access, but network enrichments and external AI requests still require connectivity. The HTTP server serves packaged static assets only; it does not process evidence or expose a network-facing port. These binaries are unsigned. CI smoke-tests the Linux x64 launcher and tests the production website; full GUI launch tests on every OS are a future hardening step.
