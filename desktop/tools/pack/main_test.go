// SPDX-License-Identifier: MIT
package main

import (
	"archive/tar"
	"archive/zip"
	"bytes"
	"compress/gzip"
	"io"
	"os"
	"path/filepath"
	"testing"
)

func stage(t *testing.T) string {
	t.Helper()
	dir := t.TempDir()
	for name, content := range map[string]string{
		"HexSpindle.app/Contents/MacOS/HexSpindle": "binary",
		"HexSpindle.app/Contents/Info.plist":       "<plist/>",
		"HexSpindle.app/Contents/Resources/a.icns": "icon",
	} {
		p := filepath.Join(dir, filepath.FromSlash(name))
		if err := os.MkdirAll(filepath.Dir(p), 0o755); err != nil {
			t.Fatal(err)
		}
		if err := os.WriteFile(p, []byte(content), 0o644); err != nil {
			t.Fatal(err)
		}
	}
	return dir
}

const exe = "HexSpindle.app/Contents/MacOS/HexSpindle"

func TestZipKeepsUnixPermissionsAndIsReproducible(t *testing.T) {
	dir, out := stage(t), t.TempDir()
	a, b := filepath.Join(out, "a.zip"), filepath.Join(out, "b.zip")
	for _, o := range []string{a, b} {
		if err := run("zip", o, dir, []string{"HexSpindle.app"}, []string{exe}); err != nil {
			t.Fatal(err)
		}
	}
	da, _ := os.ReadFile(a)
	db, _ := os.ReadFile(b)
	if !bytes.Equal(da, db) {
		t.Fatal("zip output is not reproducible")
	}
	zr, err := zip.NewReader(bytes.NewReader(da), int64(len(da)))
	if err != nil {
		t.Fatal(err)
	}
	modes := map[string]os.FileMode{}
	for _, f := range zr.File {
		modes[f.Name] = f.Mode()
	}
	if modes[exe].Perm() != 0o755 || modes["HexSpindle.app/Contents/Info.plist"].Perm() != 0o644 || !modes["HexSpindle.app/"].IsDir() {
		t.Fatalf("modes: %v", modes)
	}
}

func TestTarGzKeepsUnixPermissions(t *testing.T) {
	dir := stage(t)
	o := filepath.Join(t.TempDir(), "a.tar.gz")
	if err := run("targz", o, dir, []string{"HexSpindle.app"}, []string{exe}); err != nil {
		t.Fatal(err)
	}
	f, _ := os.Open(o)
	defer f.Close()
	zr, err := gzip.NewReader(f)
	if err != nil {
		t.Fatal(err)
	}
	tr := tar.NewReader(zr)
	modes := map[string]int64{}
	for {
		h, err := tr.Next()
		if err == io.EOF {
			break
		}
		if err != nil {
			t.Fatal(err)
		}
		modes[h.Name] = h.Mode
	}
	if modes[exe] != 0o755 || modes["HexSpindle.app/Contents/Info.plist"] != 0o644 || modes["HexSpindle.app/"] != 0o755 {
		t.Fatalf("modes: %v", modes)
	}
}

func TestPackRejectsMissingExecutable(t *testing.T) {
	if err := run("zip", filepath.Join(t.TempDir(), "x.zip"), stage(t), []string{"HexSpindle.app"}, []string{"nope"}); err == nil {
		t.Fatal("accepted an -x path that is not in the archive")
	}
}
