// Shared, CI-only CSP candidate and local static HTTP server.
// This code is not included in GitHub Pages deploy artifacts.
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { resolve, extname, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(fileURLToPath(new URL('..', import.meta.url)));
export const POLICY = [
  "default-src 'self'",
  "script-src 'self' blob: 'wasm-unsafe-eval'",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' blob: data: https: http:",
  "font-src 'self' data:",
  "connect-src * data: blob:",
  "worker-src 'self' blob:",
  "frame-src 'self' blob: data:",
  "media-src 'self' blob: data:",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
].join('; ');
const MIME = {
  '.html':'text/html; charset=utf-8', '.js':'text/javascript; charset=utf-8',
  '.mjs':'text/javascript; charset=utf-8', '.css':'text/css; charset=utf-8',
  '.json':'application/json; charset=utf-8', '.svg':'image/svg+xml',
  '.wasm':'application/wasm', '.png':'image/png', '.jpg':'image/jpeg',
  '.woff2':'font/woff2'
};
export async function startCspServer({ mode='enforce', binaryFixture=false }={}) {
  const header = mode === 'report-only' ? 'Content-Security-Policy-Report-Only' : 'Content-Security-Policy';
  const server = createServer(async (req,res) => {
    try {
      const pathname = decodeURIComponent(new URL(req.url,'http://localhost').pathname);
      if(binaryFixture && pathname === '/__csp_http_fixture__') {
        res.writeHead(200, {'Content-Type':'application/octet-stream','Access-Control-Allow-Origin':'*'});
        res.end(Buffer.from([0,1,2,127,128,255])); return;
      }
      const filename = pathname === '/' ? '/index.html' : pathname;
      const full = resolve(ROOT, '.'+filename);
      if(!full.startsWith(ROOT+sep)) {res.writeHead(403).end('Forbidden'); return;}
      const bytes = await readFile(full);
      const headers = {'Content-Type':MIME[extname(full)] || 'application/octet-stream'};
      if(filename==='/index.html') headers[header]=POLICY;
      res.writeHead(200,headers).end(bytes);
    } catch {res.writeHead(404).end('Not found');}
  });
  await new Promise(done=>server.listen(0,'127.0.0.1',done));
  return server;
}
