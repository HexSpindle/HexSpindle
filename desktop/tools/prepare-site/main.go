// SPDX-License-Identifier: MIT

// Command prepare-site copies the tested HexSpindle website build into the launcher's embedded site directory.
//
// Each file is stored gzip-compressed (with a ".gz" suffix) when that makes it noticeably smaller; the launcher
// sends that form straight to the browser. index.html gets the launcher's page marker and tab-session script (see
// desktop/internal/sitehtml); everything else, including the usage-analytics endpoint, is kept as built. The
// launcher removes that endpoint when it runs with --no-analytics.
//
//	go run ./tools/prepare-site --dist ../dist --out launcher/site
package main

import (
	"bytes"
	"compress/gzip"
	"errors"
	"flag"
	"fmt"
	"io/fs"
	"os"
	"path/filepath"
	"strings"

	"github.com/HexSpindle/HexSpindle/desktop/internal/sitehtml"
)

const placeholder = ".placeholder"

type stats struct {
	files, compressed int
	rawBytes, stored  int64
}

func main() {
	dist := flag.String("dist", "", "built website directory (output of tools/build-site.mjs)")
	out := flag.String("out", "", "launcher site directory to fill (desktop/launcher/site)")
	flag.Parse()
	st, err := prepare(*dist, *out)
	if err != nil {
		fmt.Fprintln(os.Stderr, "prepare-site:", err)
		os.Exit(1)
	}
	fmt.Printf("prepare-site: %d files, %.1f MiB of site stored as %.1f MiB (%d gzip-compressed); launcher marker and session script added to index.html\n",
		st.files, float64(st.rawBytes)/(1<<20), float64(st.stored)/(1<<20), st.compressed)
}

// transformIndex adds the launcher's page marker and session script to the built index.html.
func transformIndex(html []byte) ([]byte, error) {
	if !bytes.Contains(html, []byte("HexSpindle.js")) {
		return nil, errors.New("index.html does not load HexSpindle.js; is this the output of tools/build-site.mjs?")
	}
	return sitehtml.Localize(html)
}

func gzipBytes(data []byte) []byte {
	var b bytes.Buffer
	zw, _ := gzip.NewWriterLevel(&b, gzip.BestCompression) // zero header: no name or timestamp, so output is reproducible
	_, _ = zw.Write(data)
	_ = zw.Close()
	return b.Bytes()
}

func prepare(dist, out string) (stats, error) {
	var st stats
	if dist == "" || out == "" {
		return st, errors.New("both --dist and --out are required")
	}
	for _, required := range []string{"index.html", "HexSpindle.js"} {
		if _, err := os.Stat(filepath.Join(dist, required)); err != nil {
			return st, fmt.Errorf("%s is missing from %s (build the site with tools/build-site.mjs first)", required, dist)
		}
	}
	if err := os.MkdirAll(out, 0o755); err != nil {
		return st, err
	}
	entries, err := os.ReadDir(out)
	if err != nil {
		return st, err
	}
	for _, e := range entries {
		if e.Name() != placeholder {
			if err := os.RemoveAll(filepath.Join(out, e.Name())); err != nil {
				return st, err
			}
		}
	}
	err = filepath.WalkDir(dist, func(p string, d fs.DirEntry, err error) error {
		if err != nil {
			return err
		}
		rel, _ := filepath.Rel(dist, p)
		rel = filepath.ToSlash(rel)
		if rel == "." {
			return nil
		}
		for _, part := range strings.Split(rel, "/") {
			if strings.HasPrefix(part, ".") { // .nojekyll and similar are only meaningful to GitHub Pages
				if d.IsDir() {
					return filepath.SkipDir
				}
				return nil
			}
		}
		if d.IsDir() {
			return nil
		}
		if strings.HasSuffix(rel, ".gz") {
			return fmt.Errorf("%s: site files ending in .gz are ambiguous with the launcher's compressed storage", rel)
		}
		data, err := os.ReadFile(p)
		if err != nil {
			return err
		}
		if rel == "index.html" {
			if data, err = transformIndex(data); err != nil {
				return err
			}
		}
		target := filepath.Join(out, filepath.FromSlash(rel))
		if err := os.MkdirAll(filepath.Dir(target), 0o755); err != nil {
			return err
		}
		stored := data
		if gz := gzipBytes(data); len(gz) < len(data)*9/10 {
			stored, target = gz, target+".gz"
			st.compressed++
		}
		st.files++
		st.rawBytes += int64(len(data))
		st.stored += int64(len(stored))
		return os.WriteFile(target, stored, 0o644)
	})
	return st, err
}
