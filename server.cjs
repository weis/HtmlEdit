// Minimal static server for local preview
const http = require('http');
const fs = require('fs');
const path = require('path');

const port = process.env.PORT ? Number(process.env.PORT) : 5173;
const root = process.cwd();

const mime = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.map': 'application/json; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
};

const serveFile = (filePath, res) => {
  fs.readFile(filePath, (err, data) => {
    if (err) {
      res.statusCode = 404;
      res.end('Not found');
      return;
    }
    const ext = path.extname(filePath);
    res.setHeader('Content-Type', mime[ext] || 'application/octet-stream');
    res.end(data);
  });
};

const server = http.createServer((req, res) => {
  const url = (req.url || '/').split('?')[0];
  // Default to index.html at root
  if (url === '/' || url === '/index.html') {
    return serveFile(path.join(root, 'index.html'), res);
  }
  // Serve anything under dist/
  if (url.startsWith('/dist/')) {
    return serveFile(path.join(root, url), res);
  }
  // Fallback
  res.statusCode = 404;
  res.end('Not found');
});

server.listen(port, () => {
  console.log(`Preview server running at http://localhost:${port}`);
});

