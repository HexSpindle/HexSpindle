// SPDX-License-Identifier: MIT
package main

import (
	"bytes"
	"compress/gzip"
	"io"
	"os"
	"path/filepath"
	"strings"
	"testing"

	"github.com/HexSpindle/HexSpindle/desktop/internal/sitehtml"
)

const index = `<!doctype html><html><head>
  <meta charset="utf-8">
  <meta name="hexspindle-analytics-endpoint" content="https://collector.example/v1/events">
  <script type="module" src="HexSpindle.js"></script>
</head><body></body></html>`

func TestTransformIndexMarksThePageAndKeepsAnalytics(t *testing.T) {
	out, err := transformIndex([]byte(index))
	if err != nil {
		t.Fatal(err)
	}
	s := string(out)
	if !strings.Contains(s, `<meta name="hexspindle-analytics-endpoint" content="https://collector.example/v1/events">`) {
		t.Fatalf("analytics endpoint removed:\n%s", s)
	}
	for _, tag := range []string{sitehtml.LauncherTag, sitehtml.SessionTag} {
		if strings.Count(s, tag) != 1 || strings.Index(s, tag) > strings.Index(s, "</head>") {
			t.Fatalf("%s not added once inside <head>:\n%s", tag, s)
		}
	}
	if !strings.Contains(s, `<meta charset="utf-8">`) || !strings.Contains(s, `src="HexSpindle.js"`) {
		t.Fatalf("unrelated markup changed:\n%s", s)
	}
}

func TestTransformIndexRejectsUnexpectedPages(t *testing.T) {
	for name, html := range map[string]string{
		"not the built site": `<html><head></head><body></body></html>`,
		"no head":            `<html><script src="HexSpindle.js"></script></html>`,
		"two heads":          `<head></head><head></head><script src="HexSpindle.js"></script>`,
	} {
		if _, err := transformIndex([]byte(html)); err == nil {
			t.Errorf("%s: accepted", name)
		}
	}
}

func write(t *testing.T, path, content string) {
	t.Helper()
	if err := os.MkdirAll(filepath.Dir(path), 0o755); err != nil {
		t.Fatal(err)
	}
	if err := os.WriteFile(path, []byte(content), 0o644); err != nil {
		t.Fatal(err)
	}
}

func TestPrepareCopiesCompressesAndCleans(t *testing.T) {
	dist, out := t.TempDir(), t.TempDir()
	big := strings.Repeat("compressible text ", 2000)
	write(t, filepath.Join(dist, "index.html"), index)
	write(t, filepath.Join(dist, "HexSpindle.js"), big)
	write(t, filepath.Join(dist, "modules", "x", "_lib.mjs"), big)
	write(t, filepath.Join(dist, "tiny.txt"), "hi")
	write(t, filepath.Join(dist, ".nojekyll"), "")
	write(t, filepath.Join(out, ".placeholder"), "keep")
	write(t, filepath.Join(out, "stale.js"), "from an older build")

	st, err := prepare(dist, out)
	if err != nil {
		t.Fatal(err)
	}
	if st.files != 4 {
		t.Fatalf("files = %d, want 4 (dotfiles skipped)", st.files)
	}
	for _, p := range []string{".placeholder", "index.html.gz", "HexSpindle.js.gz", "modules/x/_lib.mjs.gz", "tiny.txt"} {
		if _, err := os.Stat(filepath.Join(out, p)); err != nil {
			t.Errorf("missing %s", p)
		}
	}
	for _, p := range []string{"stale.js", ".nojekyll", "HexSpindle.js", "tiny.txt.gz"} {
		if _, err := os.Stat(filepath.Join(out, p)); err == nil {
			t.Errorf("unexpected %s", p)
		}
	}
	data, _ := os.ReadFile(filepath.Join(out, "HexSpindle.js.gz"))
	zr, err := gzip.NewReader(bytes.NewReader(data))
	if err != nil {
		t.Fatal(err)
	}
	plain, _ := io.ReadAll(zr)
	if string(plain) != big {
		t.Fatal("compressed file does not round-trip")
	}
	again, _ := os.ReadFile(filepath.Join(out, "HexSpindle.js.gz"))
	if _, err := prepare(dist, out); err != nil {
		t.Fatal(err)
	}
	second, _ := os.ReadFile(filepath.Join(out, "HexSpindle.js.gz"))
	if !bytes.Equal(again, second) {
		t.Fatal("output is not reproducible")
	}
}

func TestPrepareRequiresABuiltSite(t *testing.T) {
	if _, err := prepare(t.TempDir(), t.TempDir()); err == nil {
		t.Fatal("accepted a directory without index.html and HexSpindle.js")
	}
	dist := t.TempDir()
	write(t, filepath.Join(dist, "index.html"), index)
	write(t, filepath.Join(dist, "HexSpindle.js"), "x")
	write(t, filepath.Join(dist, "data.gz"), "x")
	if _, err := prepare(dist, t.TempDir()); err == nil {
		t.Fatal("accepted a site file ending in .gz")
	}
}
