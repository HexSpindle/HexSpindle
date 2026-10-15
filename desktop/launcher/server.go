// SPDX-License-Identifier: MIT
package main

import (
	"bytes"
	"compress/gzip"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"io/fs"
	"net/http"
	"os"
	"path"
	"regexp"
	"strings"
	"time"

	"github.com/HexSpindle/HexSpindle/desktop/internal/sitehtml"
)

// Content types are set explicitly instead of asking the operating system. On Windows, Go's lookup reads the
// registry, where ".js" is often mapped to "text/plain" — browsers then refuse to run the app's ES modules.
var contentTypes = map[string]string{
	".html": "text/html; charset=utf-8", ".htm": "text/html; charset=utf-8",
	".js": "text/javascript; charset=utf-8", ".mjs": "text/javascript; charset=utf-8",
	".css": "text/css; charset=utf-8", ".json": "application/json; charset=utf-8",
	".wasm": "application/wasm", ".png": "image/png", ".jpg": "image/jpeg", ".jpeg": "image/jpeg",
	".gif": "image/gif", ".webp": "image/webp", ".svg": "image/svg+xml", ".ico": "image/x-icon",
	".txt": "text/plain; charset=utf-8", ".md": "text/markdown; charset=utf-8", ".xml": "application/xml",
	".woff": "font/woff", ".woff2": "font/woff2", ".webmanifest": "application/manifest+json",
	"": "text/plain; charset=utf-8", // LICENSE
}

func contentType(name string) string {
	if t, ok := contentTypes[strings.ToLower(path.Ext(name))]; ok {
		return t
	}
	return "application/octet-stream"
}

// assetSource supplies the site files the launcher serves. gzipped reports that data is gzip-compressed.
type assetSource interface {
	read(name string) (data []byte, gzipped bool, err error)
}

func hasIndex(a assetSource) bool {
	_, _, err := a.read("index.html")
	return err == nil
}

// siteAssets reads the packaged site. prepare-site stores each file either as-is or, when that is smaller,
// gzip-compressed with a ".gz" suffix; the server sends the compressed form to browsers (which all accept it).
type siteAssets struct{ fsys fs.FS }

func (a siteAssets) read(name string) (data []byte, gzipped bool, err error) {
	if data, err = fs.ReadFile(a.fsys, name+".gz"); err == nil {
		return data, true, nil
	}
	data, err = fs.ReadFile(a.fsys, name)
	return data, false, err
}

func embeddedAssets() siteAssets {
	sub, err := fs.Sub(siteFS, "site")
	if err != nil {
		panic(err) // "site" is a valid path, so this cannot happen
	}
	return siteAssets{fsys: sub}
}

// dirAssets serves a site folder from disk (--site): a HexSpindle source folder, or a site built with
// tools/build-site.mjs. Files are read on every request, so edits show up when the page is reloaded. os.Root
// keeps every read inside the folder, including reads through symbolic links.
type dirAssets struct{ root *os.Root }

func openSiteDir(dir string) (dirAssets, error) {
	root, err := os.OpenRoot(dir)
	if err != nil {
		return dirAssets{}, fmt.Errorf("cannot open the site folder: %w", err)
	}
	a := dirAssets{root: root}
	if _, _, err := a.read("index.html"); err != nil {
		root.Close()
		if errors.Is(err, fs.ErrNotExist) {
			return dirAssets{}, fmt.Errorf("%s has no index.html; --site needs the HexSpindle source folder (the one that contains index.html) or a site built with tools/build-site.mjs", dir)
		}
		return dirAssets{}, fmt.Errorf("%s/index.html: %w", dir, err)
	}
	return a, nil
}

func (a dirAssets) read(name string) ([]byte, bool, error) {
	data, err := fs.ReadFile(a.root.FS(), name)
	if err != nil || name != "index.html" {
		return data, false, err
	}
	data, err = sitehtml.Localize(data)
	return data, false, err
}

// withoutAnalytics serves index.html with the usage-analytics endpoint removed, which turns the app's analytics
// off (--no-analytics). Other files are passed through unchanged.
type withoutAnalytics struct{ assetSource }

func (a withoutAnalytics) read(name string) ([]byte, bool, error) {
	data, gzipped, err := a.assetSource.read(name)
	if err != nil || name != "index.html" {
		return data, gzipped, err
	}
	if gzipped {
		if data, err = gunzip(data); err != nil {
			return nil, false, err
		}
	}
	data, err = sitehtml.RemoveAnalytics(data)
	return data, false, err
}

type server struct {
	assets   assetSource
	port     int
	sessions *sessions
	feeds    *feedProxy
	info     launcherInfo
}

type launcherInfo struct {
	App     string `json:"app"`
	Version string `json:"version"`
	Commit  string `json:"commit,omitempty"`
}

const launcherApp = "hexspindle-launcher"

var tabID = regexp.MustCompile(`^[A-Za-z0-9-]{8,64}$`)

func (s *server) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	h := w.Header()
	h.Set("X-Content-Type-Options", "nosniff")
	h.Set("Referrer-Policy", "no-referrer")
	h.Set("Cache-Control", "no-store")
	// Only answer requests addressed to this loopback origin. A page on another site cannot reach the launcher
	// through a domain that it re-points at 127.0.0.1 (DNS rebinding), because its Host header would not match.
	if !s.allowedHost(r.Host) {
		http.Error(w, "Misdirected request", http.StatusMisdirectedRequest)
		return
	}
	switch p := r.URL.Path; {
	case p == "/__hexspindle/ping":
		s.ping(w, r)
	case p == "/__hexspindle/session.js":
		s.script(w, r)
	case p == "/__hexspindle/socket":
		s.socket(w, r)
	case p == "/__hexspindle/heartbeat", p == "/__hexspindle/bye":
		s.session(w, r, p == "/__hexspindle/bye")
	case p == "/__hexspindle/licenses":
		s.licenses(w, r)
	case strings.HasPrefix(p, "/data/feeds/"):
		s.feeds.serve(w, r)
	default:
		s.static(w, r)
	}
}

func (s *server) allowedHost(host string) bool {
	return strings.EqualFold(host, fmt.Sprintf("127.0.0.1:%d", s.port)) || strings.EqualFold(host, fmt.Sprintf("localhost:%d", s.port))
}

func allowMethods(w http.ResponseWriter, r *http.Request, methods ...string) bool {
	for _, m := range methods {
		if r.Method == m {
			return true
		}
	}
	w.Header().Set("Allow", strings.Join(methods, ", "))
	http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
	return false
}

func (s *server) static(w http.ResponseWriter, r *http.Request) {
	if !allowMethods(w, r, http.MethodGet, http.MethodHead) {
		return
	}
	name := r.URL.Path
	// Accept only canonical paths: no "..", no backslashes, no encoded tricks, no hidden files.
	if strings.ContainsAny(name, "\\\x00") || path.Clean(name) != name && name != "/" {
		http.NotFound(w, r)
		return
	}
	if name == "/" {
		name = "/index.html"
	}
	rel := strings.TrimPrefix(name, "/")
	if strings.HasSuffix(rel, ".gz") { // the compressed copies are an internal storage detail, not public paths
		http.NotFound(w, r)
		return
	}
	for _, part := range strings.Split(rel, "/") {
		if part == "" || strings.HasPrefix(part, ".") {
			http.NotFound(w, r)
			return
		}
	}
	data, gzipped, err := s.assets.read(rel)
	if err != nil {
		http.NotFound(w, r)
		return
	}
	h := w.Header()
	h.Set("Content-Type", contentType(rel))
	if gzipped {
		h.Add("Vary", "Accept-Encoding")
		if acceptsGzip(r) {
			h.Set("Content-Encoding", "gzip")
			h.Set("Content-Length", fmt.Sprint(len(data)))
			if r.Method != http.MethodHead {
				_, _ = w.Write(data)
			}
			return
		}
		zr, err := gzip.NewReader(bytes.NewReader(data))
		if err != nil {
			http.Error(w, "Corrupt packaged file", http.StatusInternalServerError)
			return
		}
		defer zr.Close()
		if r.Method != http.MethodHead {
			_, _ = io.Copy(w, zr)
		}
		return
	}
	h.Set("Content-Length", fmt.Sprint(len(data)))
	if r.Method != http.MethodHead {
		_, _ = w.Write(data)
	}
}

// acceptsGzip reports whether the request's Accept-Encoding allows gzip (an explicit "gzip;q=0" refuses it).
func acceptsGzip(r *http.Request) bool {
	wildcard := false
	for _, part := range strings.Split(r.Header.Get("Accept-Encoding"), ",") {
		fields := strings.Split(part, ";")
		token := strings.ToLower(strings.TrimSpace(fields[0]))
		q := 1.0
		for _, p := range fields[1:] {
			if k, v, ok := strings.Cut(strings.TrimSpace(p), "="); ok && strings.EqualFold(k, "q") {
				if _, err := fmt.Sscanf(v, "%g", &q); err != nil {
					q = 0
				}
			}
		}
		switch token {
		case "gzip":
			return q > 0
		case "*":
			wildcard = q > 0
		}
	}
	return wildcard
}

func (s *server) ping(w http.ResponseWriter, r *http.Request) {
	if !allowMethods(w, r, http.MethodGet) {
		return
	}
	w.Header().Set("Content-Type", "application/json; charset=utf-8")
	_ = json.NewEncoder(w).Encode(s.info)
}

func (s *server) script(w http.ResponseWriter, r *http.Request) {
	if !allowMethods(w, r, http.MethodGet, http.MethodHead) {
		return
	}
	w.Header().Set("Content-Type", "text/javascript; charset=utf-8")
	if r.Method == http.MethodGet {
		_, _ = io.WriteString(w, sessionScript)
	}
}

// session records that a HexSpindle tab is open (heartbeat) or has closed (bye). Requests that a browser marks
// as coming from another site are refused, so other pages cannot keep the launcher alive or signal on its tabs.
func (s *server) session(w http.ResponseWriter, r *http.Request, bye bool) {
	if !allowMethods(w, r, http.MethodPost) {
		return
	}
	if site := r.Header.Get("Sec-Fetch-Site"); site != "" && site != "same-origin" {
		http.Error(w, "Forbidden", http.StatusForbidden)
		return
	}
	tab := r.URL.Query().Get("tab")
	if !tabID.MatchString(tab) {
		http.Error(w, "Bad request", http.StatusBadRequest)
		return
	}
	if bye {
		s.sessions.bye(tab)
	} else {
		s.sessions.beat(tab)
	}
	w.WriteHeader(http.StatusNoContent)
}

func (s *server) licenses(w http.ResponseWriter, r *http.Request) {
	if !allowMethods(w, r, http.MethodGet) {
		return
	}
	w.Header().Set("Content-Type", "text/plain; charset=utf-8")
	_, _ = io.WriteString(w, licenseText())
}

// feedProxy forwards requests for the threat-intelligence feed files to the public HexSpindle site. The app reads
// them from data/feeds/ on its own origin; they are refreshed daily by the website and are not part of the
// package, so the launcher fetches them on demand (this needs an internet connection).
type feedProxy struct {
	upstream string
	client   *http.Client
	ua       string
}

var feedFile = regexp.MustCompile(`^[A-Za-z0-9][A-Za-z0-9_.-]{0,127}$`)

const maxFeedBytes = 1 << 30

func newFeedProxy(upstream, version string) *feedProxy {
	client := &http.Client{
		Timeout: 3 * time.Minute,
		CheckRedirect: func(req *http.Request, via []*http.Request) error {
			if len(via) >= 5 {
				return errors.New("too many redirects")
			}
			if req.URL.Scheme != "https" && !strings.HasPrefix(upstream, "http://127.0.0.1:") {
				return errors.New("refusing a non-HTTPS redirect")
			}
			return nil
		},
	}
	return &feedProxy{upstream: strings.TrimRight(upstream, "/"), client: client, ua: "HexSpindle-Launcher/" + version}
}

func (f *feedProxy) serve(w http.ResponseWriter, r *http.Request) {
	if !allowMethods(w, r, http.MethodGet, http.MethodHead) {
		return
	}
	name := strings.TrimPrefix(r.URL.Path, "/data/feeds/")
	if !feedFile.MatchString(name) {
		http.NotFound(w, r)
		return
	}
	req, err := http.NewRequestWithContext(r.Context(), r.Method, f.upstream+"/data/feeds/"+name, nil)
	if err != nil {
		http.Error(w, "Bad feed request", http.StatusBadRequest)
		return
	}
	req.Header.Set("User-Agent", f.ua)
	resp, err := f.client.Do(req)
	if err != nil {
		http.Error(w, "Feed data needs an internet connection: could not reach "+f.upstream, http.StatusBadGateway)
		return
	}
	defer resp.Body.Close()
	for _, k := range []string{"Content-Type", "Content-Length", "Last-Modified", "ETag"} {
		if v := resp.Header.Get(k); v != "" {
			w.Header().Set(k, v)
		}
	}
	w.WriteHeader(resp.StatusCode)
	if r.Method != http.MethodHead {
		_, _ = io.Copy(w, io.LimitReader(resp.Body, maxFeedBytes))
	}
}
