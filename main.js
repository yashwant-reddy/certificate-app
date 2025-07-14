// TOP: Only run this process as express server if started directly for server.js
if (process.argv.length > 1 && process.argv[1].endsWith('server.js')) {
  require('./server.js');
  return; // Prevent Electron app logic!
}

const { app, BrowserWindow } = require('electron');
const path = require('path');
const childProcess = require('child_process');

let serverProcess = null;
let mainWindow = null;

// Find server.js for both dev and prod
function getServerScript() {
  if (app.isPackaged) {
    return path.join(process.resourcesPath, 'app', 'server.js');
  } else {
    return path.join(__dirname, 'server.js');
  }
}

// Start Express only once
function startServer() {
  if (serverProcess) return;

  const serverScript = getServerScript();
  const nodeExec = process.execPath;

  serverProcess = childProcess.spawn(nodeExec, [serverScript], {
    stdio: 'inherit',
    shell: false,
  });
  console.log('[INFO] Express server started as child process.');
}

// Main window creation: Always maximized
function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 900,
    maximizable: true,
    resizable: true,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
    },
  });

  mainWindow.loadURL('http://localhost:4000');
  mainWindow.maximize();
  mainWindow.focus();
}

// Ensure ALL new windows (popups, etc) are maximized
app.on('browser-window-created', (event, window) => {
  window.maximize();
  window.setResizable(false);
  window.focus();
});

app.whenReady().then(() => {
  if (!app.__started) {
    app.__started = true;
    startServer();
    setTimeout(createWindow, 1200); // Delay to let Express start
  }
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('before-quit', () => {
  if (serverProcess) {
    console.log('[INFO] Killing Express server process...');
    serverProcess.kill();
    serverProcess = null;
  }
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

console.log('==> main.js running as', JSON.stringify(process.argv));
