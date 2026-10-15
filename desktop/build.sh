#!/usr/bin/env bash
# SPDX-License-Identifier: MIT
#
# Builds the HexSpindle portable launcher for every supported platform from a tested website build.
#
#   desktop/build.sh --dist <built site dir> --out <dir> [--version 1.2.3] [--commit <sha>]
#
# Produces, in <dir>:
#   HexSpindle-<version>-windows-x64.exe, -windows-arm64.exe     single-file Windows programs
#   HexSpindle-<version>-macos-universal.zip                     HexSpindle.app for Apple Silicon and Intel Macs
#   HexSpindle-<version>-linux-x64.tar.gz/.deb/.rpm (and arm64)  Linux binary, Debian/Ubuntu and Fedora/RHEL packages
#   HexSpindle-<version>-source.tar.gz, -source.zip              the source needed to run or rebuild it (git-tracked files)
#   SHA256SUMS.txt
#
# Requires Go (the version in desktop/go.mod). go-winres and nfpm are installed at the pinned versions below.
# Set RCODESIGN to an rcodesign binary to give the macOS app its ad-hoc signature (macOS will not run unsigned
# Apple Silicon code); with REQUIRE_MACOS_SIGNATURE=1, as in CI, a missing RCODESIGN is an error.
# BUILD_NUMBER (optional) becomes the fourth part of the Windows file version and the macOS bundle version.
set -euo pipefail

GO_WINRES=github.com/tc-hib/go-winres@v0.3.3
NFPM=github.com/goreleaser/nfpm/v2/cmd/nfpm@v2.48.0

here="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
repo="$(cd "$here/.." && pwd)"
dist="" out="" version="0.0.0-dev" commit="${COMMIT:-}"
while [ $# -gt 0 ]; do
  case "$1" in
    --dist) dist="$2"; shift 2 ;;
    --out) out="$2"; shift 2 ;;
    --version) version="$2"; shift 2 ;;
    --commit) commit="$2"; shift 2 ;;
    *) echo "unknown argument: $1" >&2; exit 2 ;;
  esac
done
if [ -z "$dist" ] || [ -z "$out" ]; then
  echo "usage: $0 --dist <built site dir> --out <dir> [--version X.Y.Z] [--commit SHA]" >&2
  exit 2
fi
version="${version#v}"
if ! [[ "$version" =~ ^[0-9]+\.[0-9]+\.[0-9]+(-[0-9A-Za-z.-]+)?$ ]]; then
  echo "version must look like 1.2.3 or 1.2.3-rc.1, got: $version" >&2
  exit 2
fi
numeric="${version%%-*}"
build_number=$(( ${BUILD_NUMBER:-0} % 65536 ))
dist="$(cd "$dist" && pwd)"
mkdir -p "$out"
out="$(cd "$out" && pwd)"

# Paths handed to native programs must be in the OS's own form (this matters under Git Bash on Windows).
native() { if command -v cygpath >/dev/null 2>&1; then cygpath -m "$1"; else printf '%s' "$1"; fi; }

work="$(mktemp -d)"
cleanup() {
  rm -rf "$work"
  find "$here/launcher/site" -mindepth 1 ! -name .placeholder -exec rm -rf {} + 2>/dev/null || true
  rm -f "$here"/launcher/rsrc_windows_*.syso
}
trap cleanup EXIT
cd "$here"
export CGO_ENABLED=0

echo "==> Build tools"
for pkg in "$GO_WINRES" "$NFPM"; do GOBIN="$(native "$work/bin")" go install "$pkg"; done
GOBIN="$(native "$work/bin")" go install ./tools/prepare-site ./tools/makefat ./tools/pack
tool() { if [ -x "$work/bin/$1.exe" ]; then printf '%s' "$work/bin/$1.exe"; else printf '%s' "$work/bin/$1"; fi; }

echo "==> Website (from $dist)"
"$(tool prepare-site)" --dist "$(native "$dist")" --out "$(native "$here/launcher/site")"

echo "==> Windows resources (icon, version $numeric.$build_number)"
(cd launcher && "$(tool go-winres)" make --in winres/winres.json --out rsrc --arch amd64,arm64 \
  --product-version "$numeric.0" --file-version "$numeric.$build_number")

ldflags="-s -w -buildid= -X main.version=$version -X main.commit=$commit"
compile() { # GOOS GOARCH OUTPUT [EXTRA_LDFLAGS]
  echo "    $1/$2"
  GOOS="$1" GOARCH="$2" go build -trimpath -ldflags "$ldflags ${4:-}" -o "$(native "$3")" ./launcher
}
echo "==> Compile"
compile windows amd64 "$work/windows-amd64/HexSpindle.exe" "-H=windowsgui"
compile windows arm64 "$work/windows-arm64/HexSpindle.exe" "-H=windowsgui"
compile darwin amd64 "$work/darwin-amd64/HexSpindle"
compile darwin arm64 "$work/darwin-arm64/HexSpindle"
compile linux amd64 "$work/linux-amd64/hexspindle"
compile linux arm64 "$work/linux-arm64/hexspindle"

name="HexSpindle-$version"
notices() { # DIR: the license files every package carries
  mkdir -p "$1"
  cp "$repo/LICENSE" "$repo/THIRD_PARTY_NOTICES.md" "$repo/DATA_SOURCE_NOTICES.md" launcher/legal/GO-LICENSE.txt "$1/"
}

echo "==> Windows"
cp "$work/windows-amd64/HexSpindle.exe" "$out/$name-windows-x64.exe"
cp "$work/windows-arm64/HexSpindle.exe" "$out/$name-windows-arm64.exe"

echo "==> macOS"
app="$work/macos/HexSpindle.app"
mkdir -p "$app/Contents/MacOS" "$app/Contents/Resources"
"$(tool makefat)" -o "$(native "$app/Contents/MacOS/HexSpindle")" "$(native "$work/darwin-amd64/HexSpindle")" "$(native "$work/darwin-arm64/HexSpindle")"
sed -e "s/@SHORT_VERSION@/$numeric/" -e "s/@BUNDLE_VERSION@/$numeric.$build_number/" packaging/macos/Info.plist.in > "$app/Contents/Info.plist"
cp packaging/icons/hexspindle.icns "$app/Contents/Resources/hexspindle.icns"
notices "$app/Contents/Resources/Licenses"
if [ -n "${RCODESIGN:-}" ]; then
  # With no certificate, rcodesign applies an ad-hoc signature over the whole bundle.
  "$RCODESIGN" sign "$(native "$app")"
elif [ "${REQUIRE_MACOS_SIGNATURE:-0}" = 1 ]; then
  echo "RCODESIGN is not set, but REQUIRE_MACOS_SIGNATURE=1" >&2
  exit 1
else
  echo "    warning: RCODESIGN is not set, so the macOS app is unsigned and will not open on Apple Silicon" >&2
fi
"$(tool pack)" -format zip -o "$(native "$out/$name-macos-universal.zip")" -C "$(native "$work/macos")" \
  -x HexSpindle.app/Contents/MacOS/HexSpindle HexSpindle.app

echo "==> Linux"
maintainer="${NFPM_MAINTAINER:-HexSpindle <https://github.com/HexSpindle/HexSpindle>}"
for arch in amd64 arm64; do
  label=x64
  [ "$arch" = arm64 ] && label=arm64
  root="$work/linux-$arch-stage"
  stage="$root/$name-linux-$label"
  mkdir -p "$stage"
  cp "$work/linux-$arch/hexspindle" "$stage/hexspindle"
  cp packaging/linux/hexspindle.desktop packaging/icons/hexspindle-256.png "$stage/"
  notices "$stage"
  "$(tool pack)" -format targz -o "$(native "$out/$name-linux-$label.tar.gz")" -C "$(native "$root")" \
    -x "$name-linux-$label/hexspindle" "$name-linux-$label"
  sed -e "s|@ARCH@|$arch|" -e "s|@VERSION@|$version|" -e "s|@MAINTAINER@|$maintainer|" \
    -e "s|@BINARY@|$(native "$work/linux-$arch/hexspindle")|" -e "s|@ROOT@|$(native "$here")|" \
    -e "s|@DOCS@|$(native "$stage")|" packaging/linux/nfpm.yaml > "$work/nfpm-$arch.yaml"
  for packager in deb rpm; do
    "$(tool nfpm)" package --config "$(native "$work/nfpm-$arch.yaml")" --packager "$packager" \
      --target "$(native "$out/$name-linux-$label.$packager")"
  done
done

echo "==> Source"
# Everything needed to run HexSpindle from source or rebuild these packages, without the repository's test suite
# and CI configuration. Files are taken from what git tracks, so local leftovers (node_modules, dist) stay out.
source_paths=(index.html app.js app.css LICENSE THIRD_PARTY_NOTICES.md DATA_SOURCE_NOTICES.md robots.txt sitemap.xml
  .nojekyll google8833fe62b3f6acca.html analytics assets core licenses modules
  tools/build-site.mjs tools/vendor-inventory.json tools/package.json tools/package-lock.json desktop)
src_root="$work/source"
src="$src_root/$name-source"
count=0
while IFS= read -r -d '' f; do
  mkdir -p "$src/$(dirname "$f")"
  cp "$repo/$f" "$src/$f"
  count=$((count + 1))
done < <(git -C "$repo" ls-files -z -- "${source_paths[@]}")
for required in index.html app.js tools/build-site.mjs desktop/go.mod desktop/launcher/main.go desktop/launcher/site/.placeholder; do
  if [ ! -f "$src/$required" ]; then
    echo "source package is missing $required (is it committed?)" >&2
    exit 1
  fi
done
sed -e "s/@VERSION@/$version/g" packaging/source/README.md.in > "$src/README.md"
echo "    $count files"
for format in targz zip; do
  ext=tar.gz
  [ "$format" = zip ] && ext=zip
  "$(tool pack)" -format "$format" -o "$(native "$out/$name-source.$ext")" -C "$(native "$src_root")" \
    -x "$name-source/desktop/build.sh" "$name-source"
done

echo "==> Checksums"
if command -v sha256sum >/dev/null 2>&1; then sha256=(sha256sum); else sha256=(shasum -a 256); fi
(cd "$out" && rm -f SHA256SUMS.txt && "${sha256[@]}" HexSpindle-* > SHA256SUMS.txt && cat SHA256SUMS.txt)
