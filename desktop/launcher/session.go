// SPDX-License-Identifier: MIT
package main

import (
	"sync"
	"time"
)

// sessionScript is added to the packaged index.html (by prepare-site). Each open HexSpindle tab keeps a WebSocket
// to the launcher. When the tab closes, or the browser quits or crashes, the operating system closes that socket,
// so the launcher notices even when the page had no chance to run any code. Each page load uses a new tab ID; a
// page restored from the back/forward cache connects again under a new one.
//
// If the socket cannot be opened (for example, an extension blocks it), the tab reports every 30 seconds instead
// and says goodbye when it is closed. Browsers do not always deliver that goodbye, so the launcher then also
// drops tabs that stop reporting (idleTimeout).
const sessionScript = `(() => {
  'use strict';
  let id = '';
  const url = kind => '/__hexspindle/' + kind + '?tab=' + id;
  let socket = null, timer = 0;
  const beat = () => fetch(url('heartbeat'), { method: 'POST', cache: 'no-store', keepalive: true }).catch(() => {});
  const fallback = () => { if (!timer) { beat(); timer = setInterval(beat, 30000); } };
  const connect = () => {
    id = crypto.randomUUID();
    let opened = false;
    try { socket = new WebSocket('ws://' + location.host + url('socket')); } catch { fallback(); return; }
    socket.onopen = () => { opened = true; };
    socket.onclose = () => {
      socket = null;
      if (!opened) fallback();
      else setTimeout(connect, 1000); // dropped while the page is open: reconnect as a new tab
    };
  };
  connect();
  addEventListener('pageshow', e => { if (e.persisted && !socket) { clearInterval(timer); timer = 0; connect(); } });
  addEventListener('pagehide', e => {
    if (e.persisted) { if (socket) { socket.onclose = null; socket.close(); socket = null; } return; }
    navigator.sendBeacon(url('bye'));
  });
})();
`

// sessions tracks open HexSpindle tabs and decides when the launcher should exit:
//   - shortly after the last tab closes (exitGrace, so a reload does not stop it);
//   - if a tab without a socket stops reporting for idleTimeout (the browser was killed, or the computer slept);
//   - if no tab connects within firstConnect of starting (the browser never opened the page).
//
// With keepRunning set it never exits on its own.
type sessions struct {
	mu            sync.Mutex
	now           func() time.Time
	sockets       map[string]int       // tabs with an open socket: open exactly as long as the socket is
	tabs          map[string]time.Time // tabs without a socket, by their last heartbeat
	closed        map[string]time.Time // tabs that have closed; a heartbeat still in flight must not revive them
	started       time.Time
	emptySince    time.Time
	everConnected bool
	idleTimeout   time.Duration
	exitGrace     time.Duration
	firstConnect  time.Duration
	keepRunning   bool
	done          chan struct{}
	stopped       bool
}

func newSessions(now func() time.Time, idleTimeout, exitGrace, firstConnect time.Duration, keepRunning bool) *sessions {
	return &sessions{now: now, sockets: map[string]int{}, tabs: map[string]time.Time{}, closed: map[string]time.Time{},
		started: now(), idleTimeout: idleTimeout, exitGrace: exitGrace, firstConnect: firstConnect, keepRunning: keepRunning,
		done: make(chan struct{})}
}

func (s *sessions) beat(tab string) {
	s.mu.Lock()
	defer s.mu.Unlock()
	if _, gone := s.closed[tab]; gone || s.sockets[tab] > 0 {
		return
	}
	s.tabs[tab] = s.now()
	s.everConnected = true
}

// connect records a tab's socket. It reports false for a tab that has already closed.
func (s *sessions) connect(tab string) bool {
	s.mu.Lock()
	defer s.mu.Unlock()
	if _, gone := s.closed[tab]; gone {
		return false
	}
	s.sockets[tab]++
	delete(s.tabs, tab)
	s.everConnected = true
	return true
}

func (s *sessions) disconnect(tab string) {
	s.mu.Lock()
	defer s.mu.Unlock()
	if s.sockets[tab]--; s.sockets[tab] <= 0 {
		delete(s.sockets, tab)
		s.closeLocked(tab)
	}
}

func (s *sessions) bye(tab string) {
	s.mu.Lock()
	defer s.mu.Unlock()
	if s.sockets[tab] > 0 {
		return // the tab is closing; its socket closes next
	}
	s.closeLocked(tab)
}

// closeLocked forgets a closed tab. Each page load has its own tab ID, so a closed tab never comes back; its
// first heartbeat can still arrive after the goodbye (both are sent without waiting), so the ID is remembered
// for a while.
func (s *sessions) closeLocked(tab string) {
	s.closed[tab] = s.now()
	delete(s.tabs, tab)
	s.everConnected = true
	if s.openLocked() == 0 {
		s.emptySince = s.now()
	}
}

func (s *sessions) openLocked() int { return len(s.sockets) + len(s.tabs) }

func (s *sessions) open() int {
	s.mu.Lock()
	defer s.mu.Unlock()
	return s.openLocked()
}

// shouldExit applies the rules above at the current time.
func (s *sessions) shouldExit() bool {
	s.mu.Lock()
	defer s.mu.Unlock()
	now := s.now()
	had := s.openLocked()
	for id, seen := range s.tabs {
		if now.Sub(seen) > s.idleTimeout {
			delete(s.tabs, id)
		}
	}
	for id, at := range s.closed {
		if now.Sub(at) > time.Minute {
			delete(s.closed, id)
		}
	}
	if had > 0 && s.openLocked() == 0 {
		s.emptySince = now
	}
	switch {
	case s.keepRunning:
		return false
	case !s.everConnected:
		return now.Sub(s.started) >= s.firstConnect
	case s.openLocked() == 0:
		return now.Sub(s.emptySince) >= s.exitGrace
	}
	return false
}

// watch checks the rules every interval and closes Done() once the launcher should exit.
func (s *sessions) watch(interval time.Duration) {
	t := time.NewTicker(interval)
	defer t.Stop()
	for range t.C {
		if s.shouldExit() {
			s.stop()
			return
		}
	}
}

func (s *sessions) stop() {
	s.mu.Lock()
	defer s.mu.Unlock()
	if !s.stopped {
		s.stopped = true
		close(s.done)
	}
}

func (s *sessions) Done() <-chan struct{} { return s.done }
