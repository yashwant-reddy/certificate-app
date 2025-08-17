console.log('==> server.js running as', process.argv);
console.log('[INFO] certificate-app.exe started!');

const express = require('express');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 4000;

// --- Static: public/ ---
const publicPath = path.join(__dirname, 'public');
console.log('[INFO] Serving static files from:', publicPath);
app.use(express.static(publicPath));

// --- Static: data/ from project root, exposed at /data ---
const dataDir = path.join(__dirname, 'data');
if (fs.existsSync(dataDir)) {
  console.log('[INFO] Exposing data directory at /data:', dataDir);
  app.use(
    '/data',
    express.static(dataDir, {
      fallthrough: true,
      setHeaders: (res, filePath) => {
        // Avoid stale JSON in Electron/browser caches
        res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
        if (path.extname(filePath).toLowerCase() === '.json') {
          res.type('application/json; charset=utf-8');
        }
      },
    })
  );
} else {
  console.warn('[WARN] data directory not found:', dataDir);
}

// Log every static/file request (optional, for deeper debugging)
app.use((req, res, next) => {
  if (req.url.startsWith('/')) {
    console.log('[INFO] Request:', req.method, req.url);
  }
  next();
});

app.use(express.urlencoded({ extended: true }));

// --- Routes (conditionally load if present) ---
const routeFiles = ['./routes/upload', './routes/preview', './routes/clearUploads'];

routeFiles.forEach((routePath) => {
  try {
    const fullPath = path.join(__dirname, routePath.replace('./', '') + '.js');
    if (!fs.existsSync(fullPath)) {
      console.error(`[ERROR] Route file missing: ${fullPath}`);
    } else {
      console.log(`[INFO] Loading route: ${routePath}`);
      // mount path becomes "/upload", "/preview", "/clearUploads"
      app.use(routePath.replace('./routes', ''), require(routePath));
    }
  } catch (err) {
    console.error(`[ERROR] Failed to load route ${routePath}:`, err);
  }
});

// --- Start server ---
app.listen(PORT, () => {
  console.log(`[INFO] Server running at http://localhost:${PORT}`);
});
