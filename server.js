console.log('==> server.js running as', process.argv);

console.log('[INFO] certificate-app.exe started!');

const express = require('express');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 4000;

// Middleware
const publicPath = path.join(__dirname, 'public');
console.log('[INFO] Serving static files from:', publicPath);

app.use(express.static(publicPath));

// Log every static file request (optional, for deeper debugging)
app.use((req, res, next) => {
  if (req.url.startsWith('/')) {
    // Log every static request path
    console.log('[INFO] Request:', req.method, req.url);
  }
  next();
});

app.use(express.urlencoded({ extended: true }));

// Check if route files exist before requiring
const routeFiles = [
  './routes/upload',
  './routes/preview',
  './routes/clearUploads',
];

routeFiles.forEach((routePath) => {
  try {
    const fullPath = path.join(__dirname, routePath.replace('./', '') + '.js');
    if (!fs.existsSync(fullPath)) {
      console.error(`[ERROR] Route file missing: ${fullPath}`);
    } else {
      console.log(`[INFO] Loading route: ${routePath}`);
      app.use(routePath.replace('./routes', ''), require(routePath));
    }
  } catch (err) {
    console.error(`[ERROR] Failed to load route ${routePath}:`, err);
  }
});

// Start server
app.listen(PORT, () => {
  console.log(`[INFO] Server running at http://localhost:${PORT}`);
});
