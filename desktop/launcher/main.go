// SPDX-License-Identifier: MIT

// Command HexSpindle is the HexSpindle portable launcher. It serves the HexSpindle web app, which is built into
// this executable, on a local port that only this computer can reach (127.0.0.1), and opens it in the default
// browser. Everything runs on the user's machine; the only outside requests are the ones the app itself makes:
// feed data, which the launcher fetches from the public HexSpindle site when an operation asks for it, and the
// app's anonymous usage analytics (off with --no-analytics, or with the opt-out in the app's footer). It stops by
// itself shortly after the last HexSpindle browser tab is closed.
package main

import (
	"bytes"
	"compress/gzip"
	"context"
	"embed"
	"encoding/json"
	"errors"
	"flag"
	"fmt"
	"io"
	"log"
	"net"
	"net/http"
	"os"
	"os/signal"
	"path/filepath"
	"runtime"
	"syscall"
	"time"
)

// Set at build time with -ldflags "-X main.version=... -X main.commit=...".
var (
	version = "dev"
	commit  = ""
)

const (
	appName = "HexSpindle"
	// A fixed port keeps the page's origin the same from one run to the next, so what the app saves in browser
	// storage (recipes, settings) is still there next time. Nearby ports are used only if this one is taken.
	defaultPort   = 47800
	portAttempts  = 10
	defaultFeeds  = "https://hexspindle.github.io"
	readyBanner   = "HexSpindle running at "
	runningBanner = "HexSpindle is already running at "
)

//go:embed all:site
var siteFS embed.FS

//go:embed legal/GO-LICENSE.txt
var goLicense string

type options struct {
	port                int
	noBrowser           bool
	keepRunning         bool
	showVersion         bool
	showLicenses        bool
	idleTimeout         time.Duration
	exitGrace           time.Duration
	firstConnectTimeout time.Duration
	feedsUpstream       string
	site                string
	noAnalytics         bool
}

func parseFlags(args []string, out io.Writer) (options, error) {
	var o options
	fl := flag.NewFlagSet(appName, flag.ContinueOnError)
	fl.SetOutput(out)
	fl.IntVar(&o.port, "port", 0, fmt.Sprintf("local port to use (default: %d, or the next free one up to %d)", defaultPort, defaultPort+portAttempts-1))
	fl.BoolVar(&o.noBrowser, "no-browser", false, "do not open a browser tab; just print the address")
	fl.BoolVar(&o.keepRunning, "keep-running", false, "keep running after the last HexSpindle tab is closed (stop with Ctrl+C)")
	fl.BoolVar(&o.showVersion, "version", false, "print the version and exit")
	fl.BoolVar(&o.showLicenses, "licenses", false, "print the launcher's license notices and exit")
	fl.DurationVar(&o.idleTimeout, "idle-timeout", 30*time.Minute, "for a tab that cannot keep a connection open: treat it as closed after it has been silent this long")
	fl.DurationVar(&o.exitGrace, "exit-grace", 15*time.Second, "wait this long after the last tab closes before exiting")
	fl.DurationVar(&o.firstConnectTimeout, "first-connect-timeout", 5*time.Minute, "exit if no tab opens the app within this time")
	fl.StringVar(&o.feedsUpstream, "feeds-upstream", defaultFeeds, "site that feed data (data/feeds/) is fetched from")
	fl.StringVar(&o.site, "site", "", "serve the HexSpindle site in this folder instead of the built-in copy\n(the HexSpindle source folder, or a site built with tools/build-site.mjs)")
	fl.BoolVar(&o.noAnalytics, "no-analytics", false, "turn off the app's anonymous usage analytics (the app's footer also has an opt-out)")
	if err := fl.Parse(args); err != nil {
		return o, err
	}
	if fl.NArg() > 0 {
		return o, fmt.Errorf("unexpected argument %q (see --help)", fl.Arg(0))
	}
	if o.port < 0 || o.port > 65535 {
		return o, fmt.Errorf("--port must be between 1 and 65535")
	}
	return o, nil
}

func main() {
	attachConsole()
	opts, err := parseFlags(os.Args[1:], os.Stderr)
	if errors.Is(err, flag.ErrHelp) {
		return
	}
	if err != nil {
		fail(err.Error())
	}
	if opts.showVersion {
		fmt.Println(versionString(embeddedAssets()))
		return
	}
	if opts.showLicenses {
		fmt.Print(licenseText())
		return
	}
	logger := openLog()
	if err := run(opts, logger); err != nil {
		logger.Printf("error: %v", err)
		fail(err.Error())
	}
}

func run(opts options, logger *log.Logger) error {
	var assets assetSource = embeddedAssets()
	if opts.site != "" {
		dir, err := openSiteDir(opts.site)
		if err != nil {
			return err
		}
		defer dir.root.Close()
		assets = dir
	} else if !hasIndex(assets) {
		return errors.New("this launcher was built without the HexSpindle site; build it with desktop/build.sh, or serve a site folder with --site <folder>")
	}
	if opts.noAnalytics {
		assets = withoutAnalytics{assets}
		if _, _, err := assets.read("index.html"); err != nil {
			return fmt.Errorf("--no-analytics: %w", err)
		}
	}
	start, attempts := defaultPort, portAttempts
	if opts.port != 0 {
		start, attempts = opts.port, 1
	}
	ln, port, existing, err := acquirePort(start, attempts)
	if err != nil {
		return err
	}
	if existing != "" {
		fmt.Println(runningBanner + existing)
		logger.Printf("already running at %s", existing)
		if !opts.noBrowser {
			if err := openBrowser(existing); err != nil {
				notify("HexSpindle is running", "Open "+existing+" in your browser.")
			}
		}
		return nil
	}
	url := fmt.Sprintf("http://127.0.0.1:%d/", port)
	sess := newSessions(time.Now, opts.idleTimeout, opts.exitGrace, opts.firstConnectTimeout, opts.keepRunning)
	srv := &server{assets: assets, port: port, sessions: sess, feeds: newFeedProxy(opts.feedsUpstream, version),
		info: launcherInfo{App: launcherApp, Version: version, Commit: commit}}
	httpServer := &http.Server{Handler: srv, ReadHeaderTimeout: 10 * time.Second, IdleTimeout: 2 * time.Minute}
	served := make(chan error, 1)
	go func() { served <- httpServer.Serve(ln) }()
	go sess.watch(time.Second)

	fmt.Println(readyBanner + url)
	logger.Printf("%s serving at %s", versionString(assets), url)
	if opts.site != "" {
		fmt.Println("Serving the site folder " + opts.site)
	}
	if opts.noAnalytics {
		logger.Printf("usage analytics: off (--no-analytics)")
	} else {
		logger.Printf("usage analytics: on unless opted out in the app's footer (or start with --no-analytics)")
	}
	if !opts.noBrowser {
		if err := openBrowser(url); err != nil {
			logger.Printf("could not open a browser: %v", err)
			notify("HexSpindle is running", "Open "+url+" in your browser.")
		}
	}

	signals := make(chan os.Signal, 1)
	signal.Notify(signals, os.Interrupt, syscall.SIGTERM)
	select {
	case s := <-signals:
		logger.Printf("stopping (%v)", s)
	case <-sess.Done():
		logger.Printf("stopping: no HexSpindle tab is open")
	case err := <-served:
		if !errors.Is(err, http.ErrServerClosed) {
			return err
		}
	}
	ctx, cancel := context.WithTimeout(context.Background(), 3*time.Second)
	defer cancel()
	_ = httpServer.Shutdown(ctx)
	return nil
}

// acquirePort listens on 127.0.0.1 at the first usable port in [start, start+attempts). If one of those ports
// already serves a HexSpindle launcher, its address is returned instead so the caller can reuse it.
func acquirePort(start, attempts int) (net.Listener, int, string, error) {
	for port := start; port < start+attempts && port <= 65535; port++ {
		url := fmt.Sprintf("http://127.0.0.1:%d/", port)
		if isLauncher(url) {
			return nil, port, url, nil
		}
		ln, err := net.Listen("tcp4", fmt.Sprintf("127.0.0.1:%d", port))
		if err == nil {
			return ln, port, "", nil
		}
		// Another launcher may be starting on this port at the same moment; give it a chance to answer.
		time.Sleep(300 * time.Millisecond)
		if isLauncher(url) {
			return nil, port, url, nil
		}
	}
	if attempts == 1 {
		return nil, 0, "", fmt.Errorf("port %d on 127.0.0.1 is in use by another program; choose another with --port", start)
	}
	return nil, 0, "", fmt.Errorf("ports %d–%d on 127.0.0.1 are all in use; choose a free one with --port", start, start+attempts-1)
}

func isLauncher(url string) bool {
	client := http.Client{Timeout: 700 * time.Millisecond}
	resp, err := client.Get(url + "__hexspindle/ping")
	if err != nil {
		return false
	}
	defer resp.Body.Close()
	var info launcherInfo
	return resp.StatusCode == http.StatusOK && json.NewDecoder(io.LimitReader(resp.Body, 4096)).Decode(&info) == nil && info.App == launcherApp
}

func versionString(assets assetSource) string {
	v := fmt.Sprintf("%s portable launcher %s", appName, version)
	if commit != "" {
		v += " (" + commit + ")"
	}
	v += fmt.Sprintf(", %s/%s, %s", runtime.GOOS, runtime.GOARCH, runtime.Version())
	if bundle := bundleDigest(assets); bundle != "" {
		v += ", site bundle " + bundle
	}
	return v
}

// bundleDigest returns the start of the SHA-256 that build-site.mjs recorded for HexSpindle.js, which identifies
// exactly which tested website build is being served. A source folder has no build-info.json and no digest.
func bundleDigest(assets assetSource) string {
	data, gzipped, err := assets.read("build-info.json")
	if err != nil {
		return ""
	}
	if gzipped {
		if data, err = gunzip(data); err != nil {
			return ""
		}
	}
	var info struct {
		Files []struct {
			Path   string `json:"path"`
			SHA256 string `json:"sha256"`
		} `json:"files"`
	}
	if json.Unmarshal(data, &info) != nil {
		return ""
	}
	for _, f := range info.Files {
		if f.Path == "HexSpindle.js" && len(f.SHA256) >= 12 {
			return f.SHA256[:12]
		}
	}
	return ""
}

func licenseText() string {
	return "HexSpindle portable launcher " + version + "\n\n" +
		"The HexSpindle application is MIT licensed. Its own license and third-party notices are served by the\n" +
		"launcher at /LICENSE, /THIRD_PARTY_NOTICES.md, /DATA_SOURCE_NOTICES.md and /HexSpindle.LICENSES.txt.\n\n" +
		"The launcher is written in Go. The Go runtime and standard library compiled into it are distributed under\n" +
		"the following license:\n\n" + goLicense
}

// openLog writes a short log of the current run to the user's cache directory (useful when the launcher was
// started by double-clicking and has no console). Each run replaces the previous log.
func openLog() *log.Logger {
	writers := []io.Writer{os.Stderr}
	if dir, err := os.UserCacheDir(); err == nil {
		dir = filepath.Join(dir, appName)
		if os.MkdirAll(dir, 0o755) == nil {
			if f, err := os.Create(filepath.Join(dir, "launcher.log")); err == nil {
				writers = append(writers, f)
			}
		}
	}
	return log.New(io.MultiWriter(writers...), "", log.LstdFlags)
}

// fail reports a fatal error and exits. When the launcher was started by double-clicking (no console to print
// to), the message is also shown in a dialog so the user sees why nothing opened.
func fail(message string) {
	fmt.Fprintln(os.Stderr, "HexSpindle: "+message)
	if guiLaunch() {
		showMessage("HexSpindle could not start", message, true)
	}
	os.Exit(1)
}

func notify(title, message string) {
	fmt.Fprintln(os.Stderr, message)
	if guiLaunch() {
		showMessage(title, message, false)
	}
}

func gunzip(data []byte) ([]byte, error) {
	zr, err := gzip.NewReader(bytes.NewReader(data))
	if err != nil {
		return nil, err
	}
	defer zr.Close()
	return io.ReadAll(io.LimitReader(zr, 64<<20))
}
