// SPDX-License-Identifier: MIT
//go:build !windows

package main

import (
	"os"
	"os/exec"
)

func attachConsole() {}

// guiLaunch reports whether the launcher was started from a desktop (Finder, a menu entry) rather than a
// terminal. Such launches send standard error to /dev/null, so problems are shown in a dialog instead.
func guiLaunch() bool {
	fi, err := os.Stderr.Stat()
	if err != nil {
		return true
	}
	null, err := os.Stat(os.DevNull)
	return err == nil && os.SameFile(fi, null)
}

// start runs a helper program without waiting for it, and reaps it when it exits.
func start(name string, args ...string) error {
	cmd := exec.Command(name, args...)
	if err := cmd.Start(); err != nil {
		return err
	}
	go func() { _ = cmd.Wait() }()
	return nil
}
