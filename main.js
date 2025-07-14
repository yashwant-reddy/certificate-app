// TOP: Only run this process as express server if started directly for server.js
if (process.argv.length > 1 && process.argv[1].endsWith('server.js')) {
  require('./server.js');
  return; // Prevent Electron app logic!
}

const { app, BrowserWindow, Menu } = require('electron');
const path = require('path');
const childProcess = require('child_process');

const clearUploads = require('./utils/clearUploads');

let serverProcess = null;
let mainWindow = null;
let childWindows = []; // Track all child windows

clearUploads(); // at startup

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

// Print Menu setup
function setAppMenu(window) {
  const template = [
    {
      label: 'File',
      submenu: [
        {
          label: 'Print',
          accelerator: process.platform === 'darwin' ? 'Cmd+P' : 'Ctrl+P',
          click: () => {
            // This will show the web-style print preview!
            window.webContents.executeJavaScript('window.print()');
          },
        },
        { type: 'separator' },
        { role: 'close' }, // Close window (Ctrl+W or Cmd+W)
        { role: 'quit' }, // Quit app (Ctrl+Q or Cmd+Q)
      ],
    },
    {
      label: 'Edit',
      submenu: [
        { role: 'undo' },
        { role: 'redo' },
        { type: 'separator' },
        { role: 'cut' },
        { role: 'copy' },
        { role: 'paste' },
        { role: 'pasteAndMatchStyle' },
        { role: 'delete' },
        { role: 'selectAll' },
      ],
    },
    {
      label: 'View',
      submenu: [
        { role: 'reload' },
        { role: 'forceReload' },
        { role: 'toggleDevTools' },
        { type: 'separator' },
        { role: 'resetZoom' },
        { role: 'zoomIn' },
        { role: 'zoomOut' },
        { type: 'separator' },
        { role: 'togglefullscreen' },
      ],
    },
    {
      label: 'Window',
      submenu: [{ role: 'minimize' }, { role: 'zoom' }, { role: 'close' }],
    },
    {
      label: 'Help',
      submenu: [
        {
          label: 'Learn More',
          click: async () => {
            const { shell } = require('electron');
            await shell.openExternal('https://electronjs.org');
          },
        },
      ],
    },
  ];

  const menu = Menu.buildFromTemplate(template);
  window.setMenu(menu);
}

// Print keboard shortcutavailable for all
function enablePrintShortcut(window) {
  window.webContents.on('before-input-event', (event, input) => {
    const isPrint =
      (process.platform === 'darwin' &&
        input.meta &&
        input.key.toLowerCase() === 'p') ||
      (process.platform !== 'darwin' &&
        input.control &&
        input.key.toLowerCase() === 'p');
    if (isPrint) {
      window.webContents.print();
      event.preventDefault();
    }
  });
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

  mainWindow.maximize();

  mainWindow.loadURL('http://localhost:4000');
  setAppMenu(mainWindow);

  // When main window closes, close all child windows
  mainWindow.on('close', () => {
    for (const win of childWindows) {
      if (!win.isDestroyed()) win.close();
    }
    childWindows = [];
  });

  // Handle all new window requests so that every popup is maximized/resizable
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    const child = new BrowserWindow({
      width: 1200,
      height: 900,
      maximizable: true,
      resizable: true,
      webPreferences: {
        nodeIntegration: false,
        contextIsolation: true,
      },
    });
    child.maximize();
    child.loadURL(url);
    setAppMenu(child);
    childWindows.push(child);

    // Remove from array when closed
    child.on('closed', () => {
      childWindows = childWindows.filter((win) => win !== child);
    });

    return { action: 'deny' };
  });
}

// Ensure ALL new windows (popups, etc) are maximized
app.on('browser-window-created', (event, window) => {
  window.maximize();
  window.setResizable(false);
  window.focus();
});

app.whenReady().then(() => {
  // Clear uploads at launch
  try {
    const deleted = clearUploads();
    console.log('[INFO] Cleared uploads at startup:', deleted.length, 'files.');
  } catch (err) {
    console.error('[ERROR] Failed to clear uploads at startup:', err);
  }

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
  try {
    const deleted = clearUploads();
    console.log(
      '[INFO] Cleared uploads before quitting:',
      deleted.length,
      'files.'
    );
  } catch (err) {
    console.error('[ERROR] Failed to clear uploads before quitting:', err);
  }

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
