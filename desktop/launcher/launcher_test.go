// SPDX-License-Identifier: MIT
package main

import (
	"bufio"
	"bytes"
	"compress/gzip"
	"encoding/json"
	"fmt"
	"io"
	"net"
	"net/http"
	"net/http/httptest"
	"os"
	"path/filepath"
	"strings"
	"testing"
	"testing/fstest"
	"time"

	"github.com/HexSpindle/HexSpindle/desktop/internal/sitehtml"
)

const testPort = 47800

func gz(s string) []byte {
	var b bytes.Buffer
	zw := gzip.NewWriter(&b)
	_, _ = zw.Write([]byte(s))
	_ = zw.Close()
	return b.Bytes()
}

func testSite() fstest.MapFS {
	return fstest.MapFS{
		"index.html.gz":                      {Data: gz("<html><head></head><body>app</body></html>")},
		"HexSpindle.js.gz":                   {Data: gz("console.log('hexspindle')")},
		"modules/forensics/_capstone.mjs.gz": {Data: gz("export default 1")},
		"assets/logo.png":                    {Data: []byte{0x89, 'P', 'N', 'G'}},
		"LICENSE":                            {Data: []byte("MIT License")},
		"analytics/privacy.html":             {Data: []byte("<p>privacy</p>")},
		".placeholder":                       {Data: []byte("placeholder")},
	}
}

func newTestServer(upstream string) *server {
	return &server{assets: siteAssets{fsys: testSite()}, port: testPort,
		sessions: newSessions(time.Now, time.Hour, time.Minute, time.Hour, false),
		feeds:    newFeedProxy(upstream, "test"), info: launcherInfo{App: launcherApp, Version: "test"}}
}

func request(h http.Handler, method, target string, headers map[string]string) *httptest.ResponseRecorder {
	r := httptest.NewRequest(method, target, nil)
	r.Host = fmt.Sprintf("127.0.0.1:%d", testPort)
	for k, v := range headers {
		if k == "Host" {
			r.Host = v
		} else {
			r.Header.Set(k, v)
		}
	}
	w := httptest.NewRecorder()
	h.ServeHTTP(w, r)
	return w
}

func gunzipString(t *testing.T, b []byte) string {
	t.Helper()
	out, err := gunzip(b)
	if err != nil {
		t.Fatalf("gunzip: %v", err)
	}
	return string(out)
}

func TestServesCompressedFileToGzipClients(t *testing.T) {
	w := request(newTestServer(""), "GET", "/HexSpindle.js", map[string]string{"Accept-Encoding": "gzip, deflate, br"})
	if w.Code != 200 || w.Header().Get("Content-Encoding") != "gzip" || w.Header().Get("Content-Type") != "text/javascript; charset=utf-8" {
		t.Fatalf("got %d, encoding %q, type %q", w.Code, w.Header().Get("Content-Encoding"), w.Header().Get("Content-Type"))
	}
	if got := gunzipString(t, w.Body.Bytes()); got != "console.log('hexspindle')" {
		t.Fatalf("body %q", got)
	}
}

func TestDecompressesForClientsWithoutGzip(t *testing.T) {
	w := request(newTestServer(""), "GET", "/modules/forensics/_capstone.mjs", nil)
	if w.Code != 200 || w.Header().Get("Content-Encoding") != "" || w.Body.String() != "export default 1" {
		t.Fatalf("got %d %q %q", w.Code, w.Header().Get("Content-Encoding"), w.Body.String())
	}
	if w.Header().Get("Content-Type") != "text/javascript; charset=utf-8" {
		t.Fatalf(".mjs served as %q", w.Header().Get("Content-Type"))
	}
}

func TestRootServesIndexAndRawFiles(t *testing.T) {
	s := newTestServer("")
	if w := request(s, "GET", "/", nil); w.Code != 200 || !strings.Contains(w.Body.String(), "<body>app</body>") || !strings.HasPrefix(w.Header().Get("Content-Type"), "text/html") {
		t.Fatalf("index: %d %q", w.Code, w.Body.String())
	}
	if w := request(s, "GET", "/assets/logo.png", map[string]string{"Accept-Encoding": "gzip"}); w.Code != 200 || w.Header().Get("Content-Encoding") != "" || w.Header().Get("Content-Type") != "image/png" {
		t.Fatalf("raw file: %d %q %q", w.Code, w.Header().Get("Content-Encoding"), w.Header().Get("Content-Type"))
	}
	if w := request(s, "GET", "/LICENSE", nil); w.Code != 200 || !strings.HasPrefix(w.Header().Get("Content-Type"), "text/plain") {
		t.Fatalf("LICENSE: %d %q", w.Code, w.Header().Get("Content-Type"))
	}
}

func TestContentTypesDoNotDependOnTheOS(t *testing.T) {
	for name, want := range map[string]string{"a.js": "text/javascript; charset=utf-8", "a.MJS": "text/javascript; charset=utf-8",
		"a.wasm": "application/wasm", "a.css": "text/css; charset=utf-8", "a.json": "application/json; charset=utf-8",
		"a.svg": "image/svg+xml", "LICENSE": "text/plain; charset=utf-8", "a.bin": "application/octet-stream"} {
		if got := contentType(name); got != want {
			t.Errorf("contentType(%q) = %q, want %q", name, got, want)
		}
	}
}

func TestRejectsRequestsForOtherHosts(t *testing.T) {
	s := newTestServer("")
	for host, want := range map[string]int{"evil.example": 421, "evil.example:47800": 421, "127.0.0.1:1234": 421,
		"127.0.0.1:47800": 200, "localhost:47800": 200, "LOCALHOST:47800": 200} {
		if w := request(s, "GET", "/HexSpindle.js", map[string]string{"Host": host}); w.Code != want {
			t.Errorf("Host %q: got %d, want %d", host, w.Code, want)
		}
	}
}

func TestOnlyServesCanonicalPublicPaths(t *testing.T) {
	s := newTestServer("")
	for _, p := range []string{"/../HexSpindle.js", "/modules/../HexSpindle.js", "/.placeholder", "//HexSpindle.js",
		"/analytics/", "/modules", "/missing.js", "/a%5Cb", "/__hexspindle/unknown", "/HexSpindle.js.gz"} {
		if w := request(s, "GET", p, nil); w.Code != 404 {
			t.Errorf("%s: got %d, want 404", p, w.Code)
		}
	}
}

func TestMethodsAndHeaders(t *testing.T) {
	s := newTestServer("")
	if w := request(s, "POST", "/", nil); w.Code != 405 || w.Header().Get("Allow") != "GET, HEAD" {
		t.Fatalf("POST /: %d allow=%q", w.Code, w.Header().Get("Allow"))
	}
	w := request(s, "HEAD", "/HexSpindle.js", map[string]string{"Accept-Encoding": "gzip"})
	if w.Code != 200 || w.Body.Len() != 0 || w.Header().Get("Content-Length") == "" {
		t.Fatalf("HEAD: %d body=%d len=%q", w.Code, w.Body.Len(), w.Header().Get("Content-Length"))
	}
	for k, v := range map[string]string{"X-Content-Type-Options": "nosniff", "Cache-Control": "no-store", "Referrer-Policy": "no-referrer"} {
		if w.Header().Get(k) != v {
			t.Errorf("%s = %q, want %q", k, w.Header().Get(k), v)
		}
	}
}

func TestPingIdentifiesTheLauncher(t *testing.T) {
	w := request(newTestServer(""), "GET", "/__hexspindle/ping", nil)
	var info launcherInfo
	if w.Code != 200 || json.Unmarshal(w.Body.Bytes(), &info) != nil || info.App != launcherApp || info.Version != "test" {
		t.Fatalf("ping: %d %s", w.Code, w.Body.String())
	}
}

func TestSessionScriptAndEndpoints(t *testing.T) {
	s := newTestServer("")
	if w := request(s, "GET", "/__hexspindle/session.js", nil); w.Code != 200 || !strings.Contains(w.Body.String(), "sendBeacon") ||
		!strings.HasPrefix(w.Header().Get("Content-Type"), "text/javascript") {
		t.Fatalf("session.js: %d %q", w.Code, w.Header().Get("Content-Type"))
	}
	tab := "/__hexspindle/heartbeat?tab=0f8b2c1e-aaaa-bbbb-cccc-123456789abc"
	if w := request(s, "POST", tab, map[string]string{"Sec-Fetch-Site": "same-origin"}); w.Code != 204 || s.sessions.open() != 1 {
		t.Fatalf("heartbeat: %d open=%d", w.Code, s.sessions.open())
	}
	if w := request(s, "POST", tab, map[string]string{"Sec-Fetch-Site": "cross-site"}); w.Code != 403 {
		t.Fatalf("cross-site heartbeat: %d", w.Code)
	}
	if w := request(s, "GET", tab, nil); w.Code != 405 {
		t.Fatalf("GET heartbeat: %d", w.Code)
	}
	if w := request(s, "POST", "/__hexspindle/heartbeat?tab=x", nil); w.Code != 400 {
		t.Fatalf("bad tab id: %d", w.Code)
	}
	if w := request(s, "POST", strings.Replace(tab, "heartbeat", "bye", 1), nil); w.Code != 204 || s.sessions.open() != 0 {
		t.Fatalf("bye: %d open=%d", w.Code, s.sessions.open())
	}
}

func TestFeedProxy(t *testing.T) {
	var gotPath, gotUA string
	upstream := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		gotPath, gotUA = r.URL.Path, r.UserAgent()
		w.Header().Set("Content-Type", "application/json")
		_, _ = io.WriteString(w, `{"schema_version":1,"datasets":{}}`)
	}))
	defer upstream.Close()
	s := newTestServer(upstream.URL)
	w := request(s, "GET", "/data/feeds/manifest.json", nil)
	if w.Code != 200 || w.Body.String() != `{"schema_version":1,"datasets":{}}` || w.Header().Get("Content-Type") != "application/json" {
		t.Fatalf("proxy: %d %q %q", w.Code, w.Body.String(), w.Header().Get("Content-Type"))
	}
	if gotPath != "/data/feeds/manifest.json" || gotUA != "HexSpindle-Launcher/test" {
		t.Fatalf("upstream saw %q with UA %q", gotPath, gotUA)
	}
	for _, p := range []string{"/data/feeds/../x", "/data/feeds/.hidden", "/data/feeds/a/b", "/data/feeds/"} {
		if w := request(s, "GET", p, nil); w.Code != 404 {
			t.Errorf("%s: got %d, want 404", p, w.Code)
		}
	}
	if w := request(s, "POST", "/data/feeds/manifest.json", nil); w.Code != 405 {
		t.Fatalf("POST feed: %d", w.Code)
	}
	down := newTestServer("http://127.0.0.1:1")
	if w := request(down, "GET", "/data/feeds/manifest.json", nil); w.Code != 502 {
		t.Fatalf("unreachable upstream: %d", w.Code)
	}
}

func TestAcceptsGzip(t *testing.T) {
	for header, want := range map[string]bool{"gzip": true, "gzip, deflate, br": true, "br;q=1, gzip;q=0.5": true, "gzip;q=0": false,
		"gzip;q=0.0": false, "*": true, "*;q=0": false, "identity": false, "": false, "deflate, *;q=0.1": true} {
		r := httptest.NewRequest("GET", "/", nil)
		r.Header.Set("Accept-Encoding", header)
		if got := acceptsGzip(r); got != want {
			t.Errorf("Accept-Encoding %q: got %v, want %v", header, got, want)
		}
	}
}

type clock struct{ t time.Time }

func (c *clock) now() time.Time          { return c.t }
func (c *clock) advance(d time.Duration) { c.t = c.t.Add(d) }

func TestSessionExitRules(t *testing.T) {
	c := &clock{t: time.Unix(1_800_000_000, 0)}
	s := newSessions(c.now, 30*time.Minute, 15*time.Second, 5*time.Minute, false)
	if s.shouldExit() {
		t.Fatal("exited before anything happened")
	}
	c.advance(5 * time.Minute)
	if !s.shouldExit() {
		t.Fatal("did not exit when no tab ever connected")
	}

	s = newSessions(c.now, 30*time.Minute, 15*time.Second, 5*time.Minute, false)
	s.beat("tab-0001")
	s.bye("tab-0001")
	c.advance(10 * time.Second)
	s.beat("tab-0002") // a reload: goodbye followed by a new heartbeat
	c.advance(time.Minute)
	if s.shouldExit() {
		t.Fatal("exited while a tab was open after a reload")
	}
	s.bye("tab-0002")
	c.advance(14 * time.Second)
	if s.shouldExit() {
		t.Fatal("exited before the grace period")
	}
	c.advance(time.Second)
	if !s.shouldExit() {
		t.Fatal("did not exit after the last tab closed")
	}

	s = newSessions(c.now, 30*time.Minute, 15*time.Second, 5*time.Minute, false)
	s.beat("tab-0003") // the browser dies without saying goodbye
	c.advance(31 * time.Minute)
	if s.shouldExit() || s.open() != 0 {
		t.Fatalf("silent tab: exit=%v open=%d (tab should be dropped, then the grace period applies)", s.shouldExit(), s.open())
	}
	c.advance(15 * time.Second)
	if !s.shouldExit() {
		t.Fatal("did not exit after a silent tab timed out")
	}

	s = newSessions(c.now, 30*time.Minute, 15*time.Second, 5*time.Minute, false)
	s.bye("tab-0004")  // a quickly closed tab: its goodbye overtakes its first heartbeat
	s.beat("tab-0004") // the late heartbeat must not count as an open tab
	if s.open() != 0 {
		t.Fatal("a heartbeat after the goodbye reopened the tab")
	}
	c.advance(15 * time.Second)
	if !s.shouldExit() {
		t.Fatal("did not exit after a tab whose heartbeat came late")
	}

	s = newSessions(c.now, time.Second, time.Second, time.Second, true)
	c.advance(time.Hour)
	if s.shouldExit() {
		t.Fatal("--keep-running exited")
	}
}

func freePort(t *testing.T) int {
	t.Helper()
	ln, err := net.Listen("tcp4", "127.0.0.1:0")
	if err != nil {
		t.Fatal(err)
	}
	defer ln.Close()
	return ln.Addr().(*net.TCPAddr).Port
}

func TestAcquirePortReusesARunningLauncher(t *testing.T) {
	port := freePort(t)
	ln, got, existing, err := acquirePort(port, 1)
	if err != nil || ln == nil || got != port || existing != "" {
		t.Fatalf("first acquire: ln=%v port=%d existing=%q err=%v", ln, got, existing, err)
	}
	s := newTestServer("")
	s.port = port
	srv := &http.Server{Handler: s}
	go func() { _ = srv.Serve(ln) }()
	defer srv.Close()
	_, _, existing, err = acquirePort(port, 1)
	if err != nil || existing != fmt.Sprintf("http://127.0.0.1:%d/", port) {
		t.Fatalf("second acquire should find the running launcher: existing=%q err=%v", existing, err)
	}

	other := freePort(t)
	foreign, err := net.Listen("tcp4", fmt.Sprintf("127.0.0.1:%d", other))
	if err != nil {
		t.Fatal(err)
	}
	defer foreign.Close()
	go func() { _ = http.Serve(foreign, http.NotFoundHandler()) }()
	if _, _, _, err := acquirePort(other, 1); err == nil || !strings.Contains(err.Error(), "in use by another program") {
		t.Fatalf("port held by another program: err=%v", err)
	}
}

func TestLicenseTextIncludesTheGoLicense(t *testing.T) {
	if txt := licenseText(); !strings.Contains(txt, "Copyright 2009 The Go Authors") || !strings.Contains(txt, "/THIRD_PARTY_NOTICES.md") {
		t.Fatalf("license text missing notices:\n%s", txt)
	}
}

func TestFlags(t *testing.T) {
	o, err := parseFlags([]string{"--port", "48000", "--no-browser", "--exit-grace", "2s", "--site", "..", "--no-analytics"}, io.Discard)
	if err != nil || o.port != 48000 || !o.noBrowser || o.exitGrace != 2*time.Second || o.feedsUpstream != defaultFeeds || o.site != ".." || !o.noAnalytics {
		t.Fatalf("parse: %+v %v", o, err)
	}
	if o, _ := parseFlags(nil, io.Discard); o.noAnalytics {
		t.Fatal("analytics are off by default")
	}
	if _, err := parseFlags([]string{"--port", "70000"}, io.Discard); err == nil {
		t.Fatal("accepted an out-of-range port")
	}
	if _, err := parseFlags([]string{"extra"}, io.Discard); err == nil {
		t.Fatal("accepted a stray argument")
	}
}

func writeFile(t *testing.T, path, content string) {
	t.Helper()
	if err := os.MkdirAll(filepath.Dir(path), 0o755); err != nil {
		t.Fatal(err)
	}
	if err := os.WriteFile(path, []byte(content), 0o644); err != nil {
		t.Fatal(err)
	}
}

func TestServesASiteFolder(t *testing.T) {
	dir := t.TempDir()
	writeFile(t, filepath.Join(dir, "index.html"), `<html><head><meta name="hexspindle-analytics-endpoint" content="https://collector.example/"></head><body><script type="module" src="app.js"></script></body></html>`)
	writeFile(t, filepath.Join(dir, "app.js"), "import './modules/index.js';")
	writeFile(t, filepath.Join(dir, "app.js.gz"), "not what the browser should get")
	writeFile(t, filepath.Join(dir, ".git", "config"), "[core]")
	site, err := openSiteDir(dir)
	if err != nil {
		t.Fatal(err)
	}
	defer site.root.Close()
	srv := newTestServer("http://127.0.0.1:1")
	srv.assets = site

	w := request(srv, "GET", "/", map[string]string{"Accept-Encoding": "gzip"})
	body := w.Body.String()
	if w.Code != 200 || !strings.Contains(body, "collector.example") || !strings.Contains(body, sitehtml.LauncherTag) || !strings.Contains(body, sitehtml.SessionTag) || w.Header().Get("Content-Encoding") != "" {
		t.Fatalf("index: %d %q %v", w.Code, body, w.Header())
	}
	if w := request(srv, "GET", "/app.js", map[string]string{"Accept-Encoding": "gzip"}); w.Body.String() != "import './modules/index.js';" || w.Header().Get("Content-Encoding") != "" {
		t.Fatalf("app.js: %q %v", w.Body.String(), w.Header())
	}
	for _, p := range []string{"/.git/config", "/app.js.gz", "/../outside.txt", "/missing.js"} {
		if w := request(srv, "GET", p, nil); w.Code != http.StatusNotFound {
			t.Errorf("%s: %d, want 404", p, w.Code)
		}
	}
	// Edits on disk show up on the next request.
	writeFile(t, filepath.Join(dir, "app.js"), "edited")
	if w := request(srv, "GET", "/app.js", nil); w.Body.String() != "edited" {
		t.Fatalf("after edit: %q", w.Body.String())
	}
	if bundleDigest(site) != "" {
		t.Fatal("a source folder has no bundle digest")
	}
}

func TestSiteFolderStaysInsideTheFolder(t *testing.T) {
	outside := t.TempDir()
	writeFile(t, filepath.Join(outside, "secret.txt"), "secret")
	dir := t.TempDir()
	writeFile(t, filepath.Join(dir, "index.html"), "<html><head></head></html>")
	if err := os.Symlink(filepath.Join(outside, "secret.txt"), filepath.Join(dir, "link.txt")); err != nil {
		t.Skipf("cannot create symbolic links here: %v", err)
	}
	site, err := openSiteDir(dir)
	if err != nil {
		t.Fatal(err)
	}
	defer site.root.Close()
	if data, _, err := site.read("link.txt"); err == nil {
		t.Fatalf("read through a link that leaves the folder: %q", data)
	}
}

func TestSiteFolderMustContainTheApp(t *testing.T) {
	if _, err := openSiteDir(t.TempDir()); err == nil || !strings.Contains(err.Error(), "has no index.html") {
		t.Fatalf("empty folder: %v", err)
	}
	if _, err := openSiteDir(filepath.Join(t.TempDir(), "missing")); err == nil {
		t.Fatal("accepted a folder that does not exist")
	}
	dir := t.TempDir()
	writeFile(t, filepath.Join(dir, "index.html"), "<html>no head</html>")
	if _, err := openSiteDir(dir); err == nil {
		t.Fatal("accepted an index.html the launcher cannot adapt")
	}
}

func TestNoAnalyticsRemovesTheEndpoint(t *testing.T) {
	const page = `<html><head><meta name="hexspindle-analytics-endpoint" content="https://collector.example/v1/events">` +
		sitehtml.LauncherTag + `</head><body>app</body></html>`
	site := fstest.MapFS{"index.html.gz": {Data: gz(page)}, "app.css.gz": {Data: gz("body{}")}}
	srv := newTestServer("http://127.0.0.1:1")
	srv.assets = siteAssets{fsys: site}
	if w := request(srv, "GET", "/", nil); !strings.Contains(w.Body.String(), "collector.example") {
		t.Fatalf("analytics endpoint missing by default: %q", w.Body.String())
	}
	srv.assets = withoutAnalytics{siteAssets{fsys: site}}
	for _, enc := range []string{"gzip", ""} {
		w := request(srv, "GET", "/", map[string]string{"Accept-Encoding": enc})
		if w.Code != 200 || strings.Contains(w.Body.String(), "analytics-endpoint") || !strings.Contains(w.Body.String(), "<body>app</body>") || w.Header().Get("Content-Encoding") != "" {
			t.Fatalf("accept-encoding %q: %d %q %v", enc, w.Code, w.Body.String(), w.Header())
		}
	}
	if w := request(srv, "GET", "/app.css", map[string]string{"Accept-Encoding": "gzip"}); w.Header().Get("Content-Encoding") != "gzip" || gunzipString(t, w.Body.Bytes()) != "body{}" {
		t.Fatalf("other files changed: %v", w.Header())
	}
}

// dialSocket opens a tab socket on a live test server and returns the connection and the response status line.
func dialSocket(t *testing.T, srv *server, addr, origin, tab string) (net.Conn, *bufio.Reader, string) {
	t.Helper()
	conn, err := net.Dial("tcp", addr)
	if err != nil {
		t.Fatal(err)
	}
	fmt.Fprintf(conn, "GET /__hexspindle/socket?tab=%s HTTP/1.1\r\nHost: 127.0.0.1:%d\r\nOrigin: %s\r\nConnection: keep-alive, Upgrade\r\n"+
		"Upgrade: websocket\r\nSec-WebSocket-Version: 13\r\nSec-WebSocket-Key: dGhlIHNhbXBsZSBub25jZQ==\r\n\r\n", tab, srv.port, origin)
	br := bufio.NewReader(conn)
	resp, err := http.ReadResponse(br, nil)
	if err != nil {
		t.Fatal(err)
	}
	if resp.StatusCode == http.StatusSwitchingProtocols && resp.Header.Get("Sec-WebSocket-Accept") != "s3pPLMBiTxaQ9kYGzzhZRbK+xOo=" {
		t.Fatalf("wrong accept key %q", resp.Header.Get("Sec-WebSocket-Accept"))
	}
	return conn, br, resp.Status
}

func waitFor(t *testing.T, cond func() bool, what string) {
	t.Helper()
	for i := 0; i < 200 && !cond(); i++ {
		time.Sleep(10 * time.Millisecond)
	}
	if !cond() {
		t.Fatal(what)
	}
}

func TestTabSocket(t *testing.T) {
	srv := newTestServer("http://127.0.0.1:1")
	ts := httptest.NewServer(srv)
	defer ts.Close()
	srv.port = ts.Listener.Addr().(*net.TCPAddr).Port
	addr := ts.Listener.Addr().String()
	origin := fmt.Sprintf("http://127.0.0.1:%d", srv.port)

	if c, _, status := dialSocket(t, srv, addr, "https://attacker.example", "tab-socket-0001"); !strings.HasPrefix(status, "403") {
		t.Fatalf("socket from another origin: %s", status)
	} else {
		c.Close()
	}
	conn, br, status := dialSocket(t, srv, addr, origin, "tab-socket-0001")
	if !strings.HasPrefix(status, "101") {
		t.Fatalf("handshake: %s", status)
	}
	waitFor(t, func() bool { return srv.sessions.open() == 1 }, "socket did not count as an open tab")
	srv.sessions.beat("tab-socket-0001") // heartbeats from a socket tab change nothing
	if srv.sessions.open() != 1 {
		t.Fatal("heartbeat duplicated a socket tab")
	}

	// A masked ping is answered with a pong carrying the same payload; a close frame is answered and ends it.
	mask := []byte{1, 2, 3, 4}
	frame := func(op byte, payload string) []byte {
		b := []byte{0x80 | op, 0x80 | byte(len(payload))}
		b = append(b, mask...)
		for i := range payload {
			b = append(b, payload[i]^mask[i%4])
		}
		return b
	}
	conn.Write(frame(0x9, "hi"))
	pong := make([]byte, 4)
	if _, err := io.ReadFull(br, pong); err != nil || !bytes.Equal(pong, []byte{0x8a, 2, 'h', 'i'}) {
		t.Fatalf("pong: %v %v", pong, err)
	}
	conn.Write(frame(0x8, ""))
	closing := make([]byte, 2)
	if _, err := io.ReadFull(br, closing); err != nil || !bytes.Equal(closing, []byte{0x88, 0}) {
		t.Fatalf("close reply: %v %v", closing, err)
	}
	waitFor(t, func() bool { return srv.sessions.open() == 0 }, "tab still open after its socket closed")
	conn.Close()

	// A tab that has closed cannot come back under the same ID.
	if c, _, status := dialSocket(t, srv, addr, origin, "tab-socket-0001"); !strings.HasPrefix(status, "410") {
		t.Fatalf("reconnect of a closed tab: %s", status)
	} else {
		c.Close()
	}

	// The browser going away without any closing handshake also closes the tab.
	conn, _, _ = dialSocket(t, srv, addr, origin, "tab-socket-0002")
	waitFor(t, func() bool { return srv.sessions.open() == 1 }, "second socket not counted")
	conn.Close()
	waitFor(t, func() bool { return srv.sessions.open() == 0 }, "tab still open after the connection dropped")

	if w := request(srv, "GET", "/__hexspindle/socket?tab=tab-socket-0003", map[string]string{"Origin": origin, "Host": fmt.Sprintf("127.0.0.1:%d", srv.port)}); w.Code != http.StatusUpgradeRequired {
		t.Fatalf("plain GET: %d", w.Code)
	}
}
