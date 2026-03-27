// TOP: Only run this process as express server if started directly for server.js
if (process.argv.length > 1 && process.argv[1].endsWith('server.js')) {
  require('./server.js');
  return; // Prevent Electron app logic!
}

const os = require('os');
const networkInterfaces = os.networkInterfaces();


const { app, BrowserWindow, Menu, ipcMain, dialog } = require('electron'); // globalShortcut removed
const path = require('path');
const childProcess = require('child_process');
const fs = require('fs');

const clearUploads = require('./utils/clearUploads');

// === NEW: import peek/commit ===
const { getNextRefNumber, writeCertificateData } = require('./utils/writeCertificateDetails');

let serverProcess = null;
let mainWindow = null;
let childWindows = []; // Track all child windows

clearUploads(); // at startup

ipcMain.handle('clear-uploads', async () => {
  try {
    const deleted = clearUploads();
    console.log('[INFO] Cleared uploads via IPC:', deleted.length, 'files.');
    return { success: true, deleted: deleted.length };
  } catch (err) {
    console.error('[ERROR] Failed to clear uploads via IPC:', err);
    return { success: false, error: err.message };
  }
});

// === Controlled print IPC ===
// Renderer calls this to run the full flow: assign number -> inject -> save PDF -> commit CSV
ipcMain.handle('print-and-commit', async (event, formData) => {
  const win = require('electron').BrowserWindow.fromWebContents(event.sender);
  if (!win) throw new Error('No window');

  const refNo = getNextRefNumber();

  await win.webContents.executeJavaScript(
    `window.__setCertificateRefNo && window.__setCertificateRefNo(${refNo});`,
    true
  );

  const { canceled, filePath } = await dialog.showSaveDialog(win, {
    title: 'Save Certificate PDF',
    defaultPath: `Certificate_${refNo}.pdf`,
    filters: [{ name: 'PDF', extensions: ['pdf'] }],
  });

  if (canceled || !filePath) {
    await win.webContents.executeJavaScript(
      `window.__setCertificateRefNo && window.__setCertificateRefNo(null);`,
      true
    );
    console.warn('[PRINT] Save dialog cancelled – no commit');
    return { ok: false, reason: 'save-cancelled' };
  }

  const pdfBuffer = await win.webContents.printToPDF({
    marginsType: 1,
    printBackground: true,
    landscape: false,
    pageSize: 'A4',
  });
  fs.writeFileSync(filePath, pdfBuffer);

  console.log('[PRINT] JIT refNo =', refNo);
  console.log('[PRINT] filePath chosen =', filePath);
  console.log('[PRINT] Committing CSV…');

  // user machine info
  const hostname = os.hostname();
  const machineIP = getLocalIPv4();
  formData.machineInfo = `${hostname} | ${machineIP}`;

  const committedRef = writeCertificateData(formData, refNo);
  console.log('[PRINT] Committed CSV with refNo =', committedRef);

  // ===== SAVE HTML =====
  if (formData.htmlContent && filePath) {
    const htmlPath = filePath.replace(/\.pdf$/i, '.html');
    fs.writeFileSync(htmlPath, formData.htmlContent, 'utf-8');
    console.log('[PRINT] HTML saved at =', htmlPath);
  }

  return { ok: true, pdfPath: filePath, refNo: committedRef };
});

function getLocalIPv4() {
  for (const iface of Object.values(os.networkInterfaces())) {
    for (const config of iface) {
      if (config.family === 'IPv4' && !config.internal) {
        return config.address;
      }
    }
  }
  return 'unknown-ip';
}


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
          // Send our controlled flow trigger (NOT window.print/webContents.print)
          click: () => {
            console.log('[MENU] Print clicked -> sending hotkey-print');
            window.webContents.send('hotkey-print');
          },
        },
        { type: 'separator' },
        { role: 'close' },
        { role: 'quit' },
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
        { type: 'separator' },
        {
          label: 'Find',
          accelerator: process.platform === 'darwin' ? 'Cmd+F' : 'Ctrl+F',
          click: () => {
            window.webContents.send('trigger-find');
          },
        },
      ],
    },
    {
      label: 'View',
      submenu: [
        { role: 'reload' },
        { role: 'forceReload' },
        { role: 'toggleDevTools' },
        { type: 'separator' },
        { role: 'togglefullscreen' },
      ],
    },
    {
      label: 'Window',
      submenu: [{ role: 'minimize' }, { role: 'zoom' }, { role: 'close' }],
    },
  ];

  const menu = Menu.buildFromTemplate(template);
  window.setMenu(menu);
}

// Enable Find Shortcut (Ctrl+F / Cmd+F)
function enableFindShortcut(window) {
  window.webContents.on('before-input-event', (event, input) => {
    const isFind =
      (process.platform === 'darwin' && input.meta && input.key.toLowerCase() === 'f') ||
      (process.platform !== 'darwin' && input.control && input.key.toLowerCase() === 'f');
    if (isFind) {
      window.webContents.send('trigger-find');
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
      // Use preload to expose safe IPC + DOM glue
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true,
    },
  });

  mainWindow.maximize();

  mainWindow.loadURL('http://localhost:4000');
  setAppMenu(mainWindow);

  // NOTE: Removed enablePrintShortcut(mainWindow) to avoid double triggers
  enableFindShortcut(mainWindow);

  // When main window closes, close all child windows
  mainWindow.on('close', () => {
    for (const win of childWindows) {
      if (!win.isDestroyed()) win.close();
    }
    childWindows = [];
  });

  // Handle all new window requests so that every popup is maximized/resizable
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    // 🧠 Restrict to one child window at a time
    const existingChild = childWindows.find((win) => !win.isDestroyed());

    if (existingChild) {
      const choice = dialog.showMessageBoxSync(mainWindow, {
        type: 'warning',
        buttons: ['Close Existing', 'Cancel'],
        defaultId: 1,
        title: 'Certificate Preview Already Open',
        message: 'A certificate preview window is already open.',
        detail: 'Do you want to close the current Certificate Preview?',
        normalizeAccessKeys: true,
      });

      if (choice === 0) {
        // ✅ User chose "Close Existing"
        existingChild.close();
        childWindows = childWindows.filter((w) => w !== existingChild);
      } else {
        // 🚫 Cancel new window
        return { action: 'deny' };
      }

      return { action: 'deny' };
    }

    // Listen for new-window requests manually (via 'new-window' event)
    mainWindow.webContents.on('new-window', async (event, url) => {
      event.preventDefault(); // stop Electron from opening automatically

      const existingChild = childWindows.find((win) => !win.isDestroyed());

      if (existingChild) {
        const { response } = await dialog.showMessageBox(mainWindow, {
          type: 'warning',
          buttons: ['Close Existing', 'Cancel'],
          defaultId: 1,
          title: 'Certificate Preview Already Open',
          message: 'A certificate preview window is already open.',
          detail: 'Do you want to close the current Certificate Preview?',
        });

        if (response === 0) {
          // User chose "Close Existing"
          existingChild.close();

          // Wait briefly for it to close before continuing
          existingChild.once('closed', () => {
            openChildWindow(url);
          });
          return;
        } else {
          // Cancel operation
          return;
        }
      }

      // No child window open → open new one
      openChildWindow(url);
    });

    // Helper to create child window
    function openChildWindow(url) {
      const child = new BrowserWindow({
        width: 1200,
        height: 900,
        maximizable: true,
        resizable: true,
        webPreferences: {
          preload: path.join(__dirname, 'preload.js'),
          nodeIntegration: false,
          contextIsolation: true,
        },
      });

      child.maximize();
      child.loadURL(url);
      setAppMenu(child);
      enableFindShortcut(child);

      childWindows.push(child);

      child.on('closed', () => {
        childWindows = childWindows.filter((win) => win !== child);
        try {
          const deleted = clearUploads();
          console.log(
            '[INFO] Cleared uploads after child window closed:',
            deleted.length,
            'files.'
          );
        } catch (err) {
          console.error('[ERROR] Failed to clear uploads after child window closed:', err);
        }
      });
    }

    // ✅ Safe to open a new child window
    const child = new BrowserWindow({
      width: 1200,
      height: 900,
      maximizable: true,
      resizable: true,
      webPreferences: {
        preload: path.join(__dirname, 'preload.js'),
        nodeIntegration: false,
        contextIsolation: true,
      },
    });

    child.maximize();
    child.loadURL(url);
    setAppMenu(child);
    enableFindShortcut(child);

    childWindows.push(child);

    child.on('closed', () => {
      childWindows = childWindows.filter((win) => win !== child);
      try {
        const deleted = clearUploads();
        console.log(
          '[INFO] Cleared uploads after child window closed:',
          deleted.length,
          'files.'
        );
      } catch (err) {
        console.error('[ERROR] Failed to clear uploads after child window closed:', err);
      }
    });

    // Prevent Electron from auto-opening (we manage it manually)
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
    console.log('[INFO] Cleared uploads before quitting:', deleted.length, 'files.');
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
