// SPDX-License-Identifier: MIT
//go:build windows

package main

import (
	"fmt"
	"os"
	"syscall"
	"unsafe"
)

var (
	kernel32          = syscall.NewLazyDLL("kernel32.dll")
	user32            = syscall.NewLazyDLL("user32.dll")
	shell32           = syscall.NewLazyDLL("shell32.dll")
	procAttachConsole = kernel32.NewProc("AttachConsole")
	procMessageBoxW   = user32.NewProc("MessageBoxW")
	procShellExecuteW = shell32.NewProc("ShellExecuteW")

	hadStdHandles   bool
	consoleAttached bool
)

const attachParentProcess = ^uintptr(0) // ATTACH_PARENT_PROCESS, (DWORD)-1

// attachConsole: release builds are Windows GUI programs, so double-clicking one does not open a console window.
// When started from a terminal instead, attach to that terminal so --help, --version and errors are printed
// there. If output was already redirected (to a file or a pipe), those handles are kept as they are.
func attachConsole() {
	hadStdHandles = valid(syscall.Stdout) || valid(syscall.Stderr)
	if hadStdHandles {
		return
	}
	if r, _, _ := procAttachConsole.Call(attachParentProcess); r == 0 {
		return
	}
	consoleAttached = true
	if f, err := os.OpenFile("CONOUT$", os.O_WRONLY, 0); err == nil {
		os.Stdout, os.Stderr = f, f
	}
}

func valid(h syscall.Handle) bool { return h != 0 && h != syscall.InvalidHandle }

// guiLaunch reports whether the launcher was started without any console (for example by double-clicking it),
// in which case problems are shown in a dialog instead of printed.
func guiLaunch() bool { return !hadStdHandles && !consoleAttached }

func openBrowser(url string) error {
	verb, _ := syscall.UTF16PtrFromString("open")
	target, err := syscall.UTF16PtrFromString(url)
	if err != nil {
		return err
	}
	const showNormal = 1
	r, _, _ := procShellExecuteW.Call(0, uintptr(unsafe.Pointer(verb)), uintptr(unsafe.Pointer(target)), 0, 0, showNormal)
	if r <= 32 {
		return fmt.Errorf("ShellExecute failed (%d)", r)
	}
	return nil
}

func showMessage(title, text string, isError bool) {
	t, _ := syscall.UTF16PtrFromString(title)
	m, _ := syscall.UTF16PtrFromString(text)
	const iconInformation, iconError, setForeground = 0x40, 0x10, 0x10000
	flags := uintptr(iconInformation)
	if isError {
		flags = iconError
	}
	_, _, _ = procMessageBoxW.Call(0, uintptr(unsafe.Pointer(m)), uintptr(unsafe.Pointer(t)), flags|setForeground)
}
