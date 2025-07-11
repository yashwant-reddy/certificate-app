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

// --- Use this function to find server.js in both dev and prod
function getServerScript() {
  if (app.isPackaged) {
    return path.join(process.resourcesPath, 'app', 'server.js');
  } else {
    return path.join(__dirname, 'server.js');
  }
}

function getNodeExec() {
  // In production, node might not be present, so use the Electron EXE, but with our protection above!
  if (app.isPackaged) {
    return process.execPath;
  } else {
    return process.execPath;
  }
}

function startServer() {
  if (serverProcess) return;

  const serverScript = getServerScript();
  const nodeExec = getNodeExec();

  serverProcess = childProcess.spawn(nodeExec, [serverScript], {
    stdio: 'inherit',
    shell: false,
  });
  console.log('[INFO] Express server started as child process.');
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 900,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
    },
  });

  mainWindow.loadURL('http://localhost:4000');
}

app.whenReady().then(() => {
  if (!app.__started) {
    app.__started = true;
    startServer();
    setTimeout(createWindow, 1200);
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
