// SPDX-License-Identifier: MIT

// Package sitehtml adapts HexSpindle's index.html for the portable launcher. It is used when a site is packaged
// into the launcher (tools/prepare-site) and when the launcher serves a site folder from disk (--site).
package sitehtml

import (
	"bytes"
	"errors"
	"fmt"
	"regexp"
)

const (
	// LauncherTag marks a page as served by the launcher. analytics/client.js accepts the launcher's
	// http://127.0.0.1 origin only on pages that carry it.
	LauncherTag = `<meta name="hexspindle-launcher" content="1">`
	// SessionTag loads the launcher's tab-session script, which lets the launcher exit after the last tab closes.
	SessionTag = `<script src="/__hexspindle/session.js" defer></script>`
)

var (
	analyticsMeta = regexp.MustCompile(`(?is)[ \t]*<meta\b[^>]*\bname\s*=\s*["']hexspindle-analytics-endpoint["'][^>]*>[ \t]*\r?\n?`)
	headClose     = regexp.MustCompile(`(?i)</head>`)
)

// Localize adds LauncherTag and SessionTag at the end of <head>. The rest of the page is unchanged.
func Localize(html []byte) ([]byte, error) {
	locs := headClose.FindAllIndex(html, -1)
	if len(locs) != 1 {
		return nil, fmt.Errorf("expected exactly one </head> in index.html, found %d", len(locs))
	}
	i := locs[0][0]
	var b bytes.Buffer
	b.Write(html[:i])
	b.WriteString(LauncherTag + "\n" + SessionTag + "\n")
	b.Write(html[i:])
	return b.Bytes(), nil
}

// RemoveAnalytics removes the usage-analytics endpoint, which turns analytics off for the page (--no-analytics).
func RemoveAnalytics(html []byte) ([]byte, error) {
	out := analyticsMeta.ReplaceAll(html, nil)
	if bytes.Contains(bytes.ToLower(out), []byte("hexspindle-analytics-endpoint")) {
		return nil, errors.New("could not remove the analytics endpoint from index.html")
	}
	return out, nil
}
