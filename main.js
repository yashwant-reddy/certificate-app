/**
 * main.js – Electron main process
 * Test-safe, production-safe
 */

require('dotenv').config();

const path = require('path');
const fs = require('fs');
const os = require('os');
const childProcess = require('child_process');

// --------------------------------------------------
// Detect execution mode
// --------------------------------------------------
const isServerOnly =
  process.argv.length > 1 && process.argv[1].endsWith('server.js');

const isTest = process.env.NODE_ENV === 'test';

// --------------------------------------------------
// Server-only mode (node server.js)
// --------------------------------------------------
if (isServerOnly) {
  require('./server.js');
} else {
  // --------------------------------------------------
  // Electron imports (ONLY when not server-only)
  // --------------------------------------------------
  const { app, BrowserWindow, Menu, ipcMain, dialog } = require('electron');

  const clearUploads = require('./utils/clearUploads');
  const {
    getNextRefNumber,
    writeCertificateData,
  } = require('./utils/writeCertificateDetails');

  // --------------------------------------------------
  // Globals
  // --------------------------------------------------
  let serverProcess = null;
  let mainWindow = null;

  // --------------------------------------------------
  // Helper: local IPv4
  // --------------------------------------------------
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

  // --------------------------------------------------
  // IPC: clear uploads
  // --------------------------------------------------
  ipcMain.handle('clear-uploads', async () => {
    try {
      const deleted = clearUploads();
      return { success: true, deleted: deleted.length };
    } catch (err) {
      return { success: false, error: err.message };
    }
  });

  // --------------------------------------------------
  // IPC: print and commit
  // --------------------------------------------------
  ipcMain.handle('print-and-commit', async (event, formData) => {
    const win = BrowserWindow.fromWebContents(event.sender);
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
      return { ok: false, reason: 'save-cancelled' };
    }

    const pdfBuffer = await win.webContents.printToPDF({
      marginsType: 1,
      printBackground: true,
      landscape: false,
      pageSize: 'A4',
    });

    fs.writeFileSync(filePath, pdfBuffer);

    const hostname = os.hostname();
    const machineIP = getLocalIPv4();
    formData.machineInfo = `${hostname} | ${machineIP}`;

    const committedRef = writeCertificateData(formData, refNo);

    return { ok: true, pdfPath: filePath, refNo: committedRef };
  });

  // --------------------------------------------------
  // Express server handling
  // --------------------------------------------------
  function getServerScript() {
    return app.isPackaged
      ? path.join(process.resourcesPath, 'app', 'server.js')
      : path.join(__dirname, 'server.js');
  }

  function startServer() {
    if (isTest) return;
    if (process.env.ELECTRON_START_SERVER !== 'true') return;
    if (serverProcess) return;

    serverProcess = childProcess.spawn(
      process.execPath,
      [getServerScript()],
      { stdio: 'inherit', shell: false }
    );
  }

  // --------------------------------------------------
  // Menu
  // --------------------------------------------------
  function setAppMenu(window) {
    const template = [
      {
        label: 'File',
        submenu: [
          {
            label: 'Print',
            accelerator: process.platform === 'darwin' ? 'Cmd+P' : 'Ctrl+P',
            click: () => window.webContents.send('hotkey-print'),
          },
          { type: 'separator' },
          { role: 'close' },
          { role: 'quit' },
        ],
      },
      { label: 'Edit', submenu: [{ role: 'undo' }, { role: 'redo' }] },
      { label: 'View', submenu: [{ role: 'reload' }, { role: 'toggleDevTools' }] },
    ];

    const menu = Menu.buildFromTemplate(template);
    window.setMenu(menu);
  }

  // --------------------------------------------------
  // Window creation
  // --------------------------------------------------
  function createWindow() {
    if (isTest) return;

    mainWindow = new BrowserWindow({
      width: 1200,
      height: 900,
      webPreferences: {
        preload: path.join(__dirname, 'preload.js'),
        nodeIntegration: false,
        contextIsolation: true,
      },
    });

    mainWindow.maximize();
    mainWindow.loadURL(`http://localhost:${process.env.SERVER_PORT || 4000}`);
    setAppMenu(mainWindow);
  }

  // --------------------------------------------------
  // App lifecycle
  // --------------------------------------------------
  app.whenReady().then(() => {
    if (isTest) {
      console.log('[TEST] Electron startup skipped');
      return;
    }

    try {
      clearUploads();
    } catch {}

    if (!app.__started) {
      app.__started = true;
      startServer();

      if (process.env.ELECTRON_START_WINDOW === 'true') {
        const delay = Number(process.env.ELECTRON_START_DELAY || 0);
        setTimeout(createWindow, delay);
      }
    }
  });

  app.on('before-quit', () => {
    if (serverProcess) {
      serverProcess.kill();
      serverProcess = null;
    }
  });

  app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') app.quit();
  });

  console.log('==> main.js running with NODE_ENV =', process.env.NODE_ENV);
}
