## Download

HexSpindle runs on your computer and opens in your web browser. Every download contains the complete app and
needs nothing else installed. Pick the file for your system:

| System | File |
| --- | --- |
| **Windows 10 or 11** (most PCs) | `HexSpindle-@VERSION@-windows-x64.exe` |
| Windows on ARM (Snapdragon, Surface Pro X) | `HexSpindle-@VERSION@-windows-arm64.exe` |
| **macOS 13 Ventura or newer** (Apple Silicon and Intel) | `HexSpindle-@VERSION@-macos-universal.zip` |
| Ubuntu, Debian, Linux Mint | `HexSpindle-@VERSION@-linux-x64.deb` (or `-linux-arm64.deb`) |
| Fedora, RHEL, openSUSE | `HexSpindle-@VERSION@-linux-x64.rpm` (or `-linux-arm64.rpm`) |
| Any other Linux | `HexSpindle-@VERSION@-linux-x64.tar.gz` (or `-linux-arm64.tar.gz`) |
| Source code, to run or build it yourself | `HexSpindle-@VERSION@-source.zip` or `.tar.gz` (see its `README.md`) |

**Windows:** run the `.exe`. These builds are not yet code-signed, so Windows SmartScreen may say "Windows
protected your PC": choose **More info**, then **Run anyway**.

**macOS:** open the `.zip` and drag **HexSpindle** into Applications. The app is not yet notarized by Apple, so the
first time macOS says it cannot verify it: open **System Settings → Privacy & Security**, scroll down, choose
**Open Anyway** next to HexSpindle, and confirm. After that it opens normally.

**Linux:** install the package with `sudo apt install ./HexSpindle-@VERSION@-linux-x64.deb` or
`sudo dnf install ./HexSpindle-@VERSION@-linux-x64.rpm` and start **HexSpindle** from your applications menu
(or run `hexspindle`). With the `.tar.gz`, extract it and run `./hexspindle`.

HexSpindle opens at `http://127.0.0.1:47800/` in your default browser. It has no window of its own and stops by
itself shortly after you close its last tab. Your data is processed locally in the browser. Like the website, the
app sends anonymous usage analytics (never your data), which you can turn off with **Opt out** in its footer or by
starting it with `--no-analytics`. Operations that use threat-intelligence feeds download them from
hexspindle.github.io when needed. More: [desktop/README.md](https://github.com/HexSpindle/HexSpindle/blob/@TAG@/desktop/README.md).

**Verify a download:** `SHA256SUMS.txt` lists every file's SHA-256, and each file has a build-provenance
attestation: `gh attestation verify <file> --repo HexSpindle/HexSpindle`.
