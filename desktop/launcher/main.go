// SPDX-License-Identifier: MIT
package main

import (
 "embed"
 "errors"
 "fmt"
 "io/fs"
 "log"
 "net"
 "net/http"
 "os"
 "os/exec"
 "os/signal"
 "path"
 "runtime"
 "strings"
 "syscall"
 "time"
)

//go:embed all:site
var site embed.FS

func main() {
 assets, err := fs.Sub(site, "site")
 if err != nil { log.Fatal(err) }
 listener, err := net.Listen("tcp4", "127.0.0.1:0")
 if err != nil { log.Fatal(err) }
 mux := http.NewServeMux()
 fileServer := http.FileServer(http.FS(assets))
 mux.HandleFunc("/", func(w http.ResponseWriter, r *http.Request) {
  w.Header().Set("X-Content-Type-Options", "nosniff")
  w.Header().Set("Referrer-Policy", "no-referrer")
  w.Header().Set("Cache-Control", "no-store")
  if r.Method != http.MethodGet && r.Method != http.MethodHead { http.Error(w,"Method not allowed",405); return }
  if strings.Contains(r.URL.Path, "\\") { http.NotFound(w,r); return }
  cleaned := path.Clean("/"+r.URL.Path)
  if cleaned != r.URL.Path { http.NotFound(w,r); return }
  if cleaned != "/" {
   name := strings.TrimPrefix(cleaned,"/")
   f, e := assets.Open(name)
   if e != nil { http.NotFound(w,r); return }
   info, e := f.Stat(); f.Close()
   if e != nil || info.IsDir() { http.NotFound(w,r); return }
  }
  fileServer.ServeHTTP(w,r)
 })
 server := &http.Server{Handler:mux,ReadHeaderTimeout:5*time.Second}
 url := "http://"+listener.Addr().String()+"/"
 fmt.Println("HexSpindle running at",url)
 fmt.Println("Press Ctrl+C to stop. Closing the browser tab does not stop the server.")
 go func(){ if e:=server.Serve(listener); e!=nil && !errors.Is(e,http.ErrServerClosed) {log.Println(e)} }()
 if os.Getenv("HEXSPINDLE_NO_BROWSER")!="1" { if err:=openBrowser(url); err!=nil {log.Printf("Browser could not be opened: %v; open %s manually",err,url)} }
 sig:=make(chan os.Signal,1)
 signal.Notify(sig,os.Interrupt,syscall.SIGTERM)
 <-sig
 if err:=server.Close(); err!=nil {log.Println(err)}
}
func openBrowser(url string) error {
 var cmd *exec.Cmd
 switch runtime.GOOS {
 case "windows": cmd=exec.Command("rundll32","url.dll,FileProtocolHandler",url)
 case "darwin": cmd=exec.Command("open",url)
 default: cmd=exec.Command("xdg-open",url)
 }
 return cmd.Start()
}
