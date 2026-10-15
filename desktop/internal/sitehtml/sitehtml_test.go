// SPDX-License-Identifier: MIT
package sitehtml

import (
	"strings"
	"testing"
)

const index = `<!doctype html><html><head>
  <meta charset="utf-8">
  <meta name="hexspindle-analytics-endpoint" content="https://collector.example/v1/events">
  <script type="module" src="app.js"></script>
</head><body></body></html>`

func TestLocalizeMarksThePageAndAddsTheSessionScript(t *testing.T) {
	out, err := Localize([]byte(index))
	if err != nil {
		t.Fatal(err)
	}
	s := string(out)
	head := strings.Index(s, "</head>")
	for _, tag := range []string{LauncherTag, SessionTag} {
		if strings.Count(s, tag) != 1 || strings.Index(s, tag) > head {
			t.Fatalf("%s not added once inside <head>:\n%s", tag, s)
		}
	}
	if strings.Replace(strings.Replace(s, LauncherTag+"\n", "", 1), SessionTag+"\n", "", 1) != index {
		t.Fatalf("unrelated markup changed:\n%s", s)
	}
}

func TestLocalizeRejectsUnexpectedPages(t *testing.T) {
	for name, html := range map[string]string{
		"no head":   `<html><script src="app.js"></script></html>`,
		"two heads": `<head></head><head></head>`,
	} {
		if _, err := Localize([]byte(html)); err == nil {
			t.Errorf("%s: accepted", name)
		}
	}
}

func TestRemoveAnalytics(t *testing.T) {
	out, err := RemoveAnalytics([]byte(index))
	if err != nil {
		t.Fatal(err)
	}
	s := string(out)
	if strings.Contains(s, "analytics-endpoint") || strings.Contains(s, "collector.example") {
		t.Fatalf("analytics endpoint still present:\n%s", s)
	}
	if !strings.Contains(s, `<meta charset="utf-8">`) || !strings.Contains(s, `src="app.js"`) {
		t.Fatalf("unrelated markup changed:\n%s", s)
	}
	out, err = RemoveAnalytics([]byte("<HEAD>\r\n\t<META content='x' NAME='HexSpindle-Analytics-Endpoint'>\r\n</HEAD>"))
	if err != nil || strings.Contains(strings.ToLower(string(out)), "analytics") {
		t.Fatalf("other spelling: %q %v", out, err)
	}
	if _, err := RemoveAnalytics([]byte(`<head><meta name=hexspindle-analytics-endpoint content=x></head>`)); err == nil {
		t.Fatal("accepted an endpoint it could not remove")
	}
}
