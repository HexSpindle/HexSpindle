// SPDX-License-Identifier: MIT
//go:build !windows && !darwin

package main

import (
	"errors"
	"os/exec"
)

func openBrowser(url string) error {
	for _, c := range [][]string{{"xdg-open", url}, {"gio", "open", url}, {"sensible-browser", url}} {
		if p, err := exec.LookPath(c[0]); err == nil {
			return start(p, c[1:]...)
		}
	}
	return errors.New("no xdg-open, gio or sensible-browser was found to open the browser")
}

func showMessage(title, text string, isError bool) {
	if p, err := exec.LookPath("zenity"); err == nil {
		kind := "--info"
		if isError {
			kind = "--error"
		}
		_ = exec.Command(p, kind, "--no-markup", "--title", title, "--text", text).Run()
		return
	}
	if p, err := exec.LookPath("kdialog"); err == nil {
		kind := "--msgbox"
		if isError {
			kind = "--error"
		}
		_ = exec.Command(p, "--title", title, kind, text).Run()
		return
	}
	if p, err := exec.LookPath("notify-send"); err == nil {
		_ = exec.Command(p, title, text).Run()
	}
}
