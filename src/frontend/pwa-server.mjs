/**
 * Local PWA test server
 * - Serves the local-pwa build from dist/itemloop-frontend/browser/
 * - Proxies /api/ and /storage/ to the PHP backend on :8000
 * Usage: node pwa-server.mjs [port]
 */
import http from 'http';
import https from 'https';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const PORT = parseInt(process.argv[2] || '4300', 10);
const BACKEND = 'http://localhost:8000';
const DIST = path.join(path.dirname(fileURLToPath(import.meta.url)), 'dist/itemloop-frontend/browser');

const MIME = {
  '.html': 'text/html', '.js': 'application/javascript', '.css': 'text/css',
  '.json': 'application/json', '.png': 'image/png', '.jpg': 'image/jpeg',
  '.webp': 'image/webp', '.svg': 'image/svg+xml', '.ico': 'image/x-icon',
  '.woff': 'font/woff', '.woff2': 'font/woff2', '.webmanifest': 'application/manifest+json',
};

function proxy(req, res) {
  const url = new URL(BACKEND + req.url);
  const opts = { hostname: url.hostname, port: url.port, path: url.pathname + url.search,
    method: req.method, headers: { ...req.headers, host: `${url.hostname}:${url.port}` } };
  const be = http.request(opts, (beRes) => {
    res.writeHead(beRes.statusCode, beRes.headers);
    beRes.pipe(res);
  });
  be.on('error', () => { res.writeHead(502); res.end('Backend unavailable'); });
  req.pipe(be);
}

const server = http.createServer((req, res) => {
  if (req.url.startsWith('/api') || req.url.startsWith('/storage')) return proxy(req, res);

  let filePath = path.join(DIST, req.url.split('?')[0]);
  if (!fs.existsSync(filePath) || fs.statSync(filePath).isDirectory()) filePath = path.join(DIST, 'index.html');

  const ext = path.extname(filePath);
  const mime = MIME[ext] || 'application/octet-stream';
  // No-cache for ngsw files so the SW updates immediately
  const noCache = ['.json', '.webmanifest'].includes(ext) || path.basename(filePath).startsWith('ngsw');
  res.writeHead(200, { 'Content-Type': mime, 'Cache-Control': noCache ? 'no-cache' : 'max-age=3600' });
  fs.createReadStream(filePath).pipe(res);
});

server.listen(PORT, () => console.log(`PWA server → http://localhost:${PORT}  (backend proxy → ${BACKEND})`));
