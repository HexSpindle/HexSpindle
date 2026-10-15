// SPDX-License-Identifier: MIT
package main

import (
	"bufio"
	"crypto/sha1"
	"encoding/base64"
	"encoding/binary"
	"fmt"
	"io"
	"net/http"
	"strings"
	"time"
)

const websocketGUID = "258EAFA5-E914-47DA-95CA-C5AB0DC85B11" // RFC 6455, section 1.3

// maxFramePayload bounds what a peer may send in one frame; the session script sends nothing at all.
const maxFramePayload = 1 << 16

// socket holds a tab's WebSocket (see sessionScript) open until the tab goes away. Only what that needs is
// implemented: the handshake, answering pings and closing; anything else the peer sends is discarded.
func (s *server) socket(w http.ResponseWriter, r *http.Request) {
	if !allowMethods(w, r, http.MethodGet) {
		return
	}
	// Any web page may open a WebSocket to any address, so only pages from the launcher's own origin are accepted.
	if !s.allowedOrigin(r.Header.Get("Origin")) {
		http.Error(w, "Forbidden", http.StatusForbidden)
		return
	}
	tab := r.URL.Query().Get("tab")
	if !tabID.MatchString(tab) {
		http.Error(w, "Bad request", http.StatusBadRequest)
		return
	}
	key := r.Header.Get("Sec-WebSocket-Key")
	if !hasToken(r.Header, "Connection", "upgrade") || !hasToken(r.Header, "Upgrade", "websocket") ||
		r.Header.Get("Sec-WebSocket-Version") != "13" || key == "" {
		w.Header().Set("Sec-WebSocket-Version", "13")
		http.Error(w, "Expected a WebSocket upgrade", http.StatusUpgradeRequired)
		return
	}
	hijacker, ok := w.(http.Hijacker)
	if !ok {
		http.Error(w, "WebSocket not supported", http.StatusInternalServerError)
		return
	}
	if !s.sessions.connect(tab) {
		http.Error(w, "This tab has already closed", http.StatusGone)
		return
	}
	defer s.sessions.disconnect(tab)
	conn, rw, err := hijacker.Hijack()
	if err != nil {
		return
	}
	defer conn.Close()
	_ = conn.SetDeadline(time.Time{}) // the server's header timeout must not end a socket that is meant to stay open
	accept := sha1.Sum([]byte(key + websocketGUID))
	fmt.Fprintf(rw, "HTTP/1.1 101 Switching Protocols\r\nUpgrade: websocket\r\nConnection: Upgrade\r\nSec-WebSocket-Accept: %s\r\n\r\n",
		base64.StdEncoding.EncodeToString(accept[:]))
	if rw.Flush() != nil {
		return
	}
	// Returns when the browser closes the socket: the tab was closed, or the browser quit or crashed.
	_ = serveFrames(rw)
}

// serveFrames reads frames until the connection ends, replying to pings and to the closing handshake.
func serveFrames(rw *bufio.ReadWriter) error {
	for {
		var head [2]byte
		if _, err := io.ReadFull(rw, head[:]); err != nil {
			return err
		}
		opcode, masked := head[0]&0x0f, head[1]&0x80 != 0
		size := uint64(head[1] & 0x7f)
		switch size {
		case 126:
			var ext [2]byte
			if _, err := io.ReadFull(rw, ext[:]); err != nil {
				return err
			}
			size = uint64(binary.BigEndian.Uint16(ext[:]))
		case 127:
			var ext [8]byte
			if _, err := io.ReadFull(rw, ext[:]); err != nil {
				return err
			}
			size = binary.BigEndian.Uint64(ext[:])
		}
		if size > maxFramePayload {
			return fmt.Errorf("frame of %d bytes is too large", size)
		}
		var mask [4]byte
		if masked {
			if _, err := io.ReadFull(rw, mask[:]); err != nil {
				return err
			}
		}
		payload := make([]byte, size)
		if _, err := io.ReadFull(rw, payload); err != nil {
			return err
		}
		for i := range payload {
			payload[i] ^= mask[i%4]
		}
		switch opcode {
		case 0x8: // close: answer it, then end the connection
			_, _ = rw.Write([]byte{0x88, 0x00})
			_ = rw.Flush()
			return nil
		case 0x9: // ping
			if len(payload) > 125 {
				return fmt.Errorf("control frame of %d bytes", len(payload))
			}
			_, _ = rw.Write(append([]byte{0x8a, byte(len(payload))}, payload...))
			if err := rw.Flush(); err != nil {
				return err
			}
		}
	}
}

func (s *server) allowedOrigin(origin string) bool {
	return strings.EqualFold(origin, fmt.Sprintf("http://127.0.0.1:%d", s.port)) || strings.EqualFold(origin, fmt.Sprintf("http://localhost:%d", s.port))
}

// hasToken reports whether a comma-separated header such as Connection contains token, ignoring case.
func hasToken(h http.Header, name, token string) bool {
	for _, value := range h.Values(name) {
		for _, part := range strings.Split(value, ",") {
			if strings.EqualFold(strings.TrimSpace(part), token) {
				return true
			}
		}
	}
	return false
}
