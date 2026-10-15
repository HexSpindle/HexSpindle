// SPDX-License-Identifier: MIT

// Command pack writes .zip and .tar.gz archives with explicit Unix permissions and fixed timestamps, so the
// packages are identical whichever OS builds them and executables stay executable when they are unpacked.
//
//	go run ./tools/pack -format zip   -o HexSpindle.zip    -C stage -x HexSpindle.app/Contents/MacOS/HexSpindle HexSpindle.app
//	go run ./tools/pack -format targz -o HexSpindle.tar.gz -C stage -x hexspindle/hexspindle hexspindle
package main

import (
	"archive/tar"
	"archive/zip"
	"compress/gzip"
	"errors"
	"flag"
	"fmt"
	"io"
	"io/fs"
	"os"
	"path/filepath"
	"sort"
	"strconv"
	"strings"
	"time"
)

type entry struct {
	name string // archive path, "/"-separated
	path string // file on disk ("" for a directory)
	mode fs.FileMode
}

type stringList []string

func (s *stringList) String() string     { return strings.Join(*s, ",") }
func (s *stringList) Set(v string) error { *s = append(*s, filepath.ToSlash(v)); return nil }

// fixedTime is SOURCE_DATE_EPOCH when set (the reproducible-builds convention), otherwise a constant.
func fixedTime() time.Time {
	if v := os.Getenv("SOURCE_DATE_EPOCH"); v != "" {
		if n, err := strconv.ParseInt(v, 10, 64); err == nil {
			return time.Unix(n, 0).UTC()
		}
	}
	return time.Date(2026, 1, 1, 0, 0, 0, 0, time.UTC)
}

func collect(base string, roots []string, executables map[string]bool) ([]entry, error) {
	var out []entry
	for _, root := range roots {
		err := filepath.WalkDir(filepath.Join(base, filepath.FromSlash(root)), func(p string, d fs.DirEntry, err error) error {
			if err != nil {
				return err
			}
			rel, _ := filepath.Rel(base, p)
			rel = filepath.ToSlash(rel)
			if d.Type()&fs.ModeSymlink != 0 {
				return fmt.Errorf("%s: symbolic links are not supported", rel)
			}
			if d.IsDir() {
				out = append(out, entry{name: rel + "/", mode: fs.ModeDir | 0o755})
				return nil
			}
			mode := fs.FileMode(0o644)
			if executables[rel] {
				mode = 0o755
			}
			out = append(out, entry{name: rel, path: p, mode: mode})
			return nil
		})
		if err != nil {
			return nil, err
		}
	}
	sort.Slice(out, func(i, j int) bool { return out[i].name < out[j].name })
	for x := range executables {
		found := false
		for _, e := range out {
			found = found || e.name == x
		}
		if !found {
			return nil, fmt.Errorf("executable %s is not in the archive", x)
		}
	}
	return out, nil
}

func writeZip(w io.Writer, entries []entry, mtime time.Time) error {
	zw := zip.NewWriter(w)
	for _, e := range entries {
		h := &zip.FileHeader{Name: e.name, Modified: mtime}
		h.SetMode(e.mode) // records Unix permissions (and marks the creator as Unix)
		if e.path == "" {
			if _, err := zw.CreateHeader(h); err != nil {
				return err
			}
			continue
		}
		h.Method = zip.Deflate
		f, err := zw.CreateHeader(h)
		if err != nil {
			return err
		}
		if err := copyFile(f, e.path); err != nil {
			return err
		}
	}
	return zw.Close()
}

func writeTarGz(w io.Writer, entries []entry, mtime time.Time) error {
	gz, _ := gzip.NewWriterLevel(w, gzip.BestCompression)
	tw := tar.NewWriter(gz)
	for _, e := range entries {
		h := &tar.Header{Name: e.name, Mode: int64(e.mode.Perm()), ModTime: mtime, Format: tar.FormatPAX, Uname: "root", Gname: "root"}
		if e.path == "" {
			h.Typeflag = tar.TypeDir
		} else {
			info, err := os.Stat(e.path)
			if err != nil {
				return err
			}
			h.Typeflag, h.Size = tar.TypeReg, info.Size()
		}
		if err := tw.WriteHeader(h); err != nil {
			return err
		}
		if e.path != "" {
			if err := copyFile(tw, e.path); err != nil {
				return err
			}
		}
	}
	if err := tw.Close(); err != nil {
		return err
	}
	return gz.Close()
}

func copyFile(w io.Writer, path string) error {
	f, err := os.Open(path)
	if err != nil {
		return err
	}
	defer f.Close()
	_, err = io.Copy(w, f)
	return err
}

func run(format, output, base string, roots []string, exec []string) error {
	if output == "" || len(roots) == 0 {
		return errors.New("usage: pack -format zip|targz -o <output> -C <dir> [-x <executable>]... <entry>...")
	}
	executables := map[string]bool{}
	for _, x := range exec {
		executables[x] = true
	}
	entries, err := collect(base, roots, executables)
	if err != nil {
		return err
	}
	f, err := os.Create(output)
	if err != nil {
		return err
	}
	defer f.Close()
	switch format {
	case "zip":
		err = writeZip(f, entries, fixedTime())
	case "targz":
		err = writeTarGz(f, entries, fixedTime())
	default:
		err = fmt.Errorf("unknown -format %q (zip or targz)", format)
	}
	if err != nil {
		return err
	}
	return f.Close()
}

func main() {
	format := flag.String("format", "zip", "zip or targz")
	output := flag.String("o", "", "output archive")
	base := flag.String("C", ".", "directory the entries are relative to")
	var exec stringList
	flag.Var(&exec, "x", "path (relative to -C) to store as executable; repeatable")
	flag.Parse()
	if err := run(*format, *output, *base, flag.Args(), exec); err != nil {
		fmt.Fprintln(os.Stderr, "pack:", err)
		os.Exit(1)
	}
}
