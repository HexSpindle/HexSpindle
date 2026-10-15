// SPDX-License-Identifier: MIT
//go:build darwin

package main

import "os/exec"

func openBrowser(url string) error { return start("open", url) }

func showMessage(title, text string, isError bool) {
	kind := "informational"
	if isError {
		kind = "critical"
	}
	// The title and text are passed as arguments, never spliced into the script.
	_ = exec.Command("osascript", "-e", "on run argv", "-e", "display alert (item 1 of argv) message (item 2 of argv) as "+kind,
		"-e", "end run", title, text).Run()
}
