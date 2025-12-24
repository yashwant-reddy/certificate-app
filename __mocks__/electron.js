/**
 * Manual Electron mock for Jest
 * This file is automatically picked up by Jest
 */

const ipcHandlers = new Map();

const ipcMain = {
  handle: jest.fn((channel, handler) => {
    ipcHandlers.set(channel, handler);
  }),

  removeHandler: jest.fn((channel) => {
    ipcHandlers.delete(channel);
  }),

  eventNames: jest.fn(() => Array.from(ipcHandlers.keys())),
};

const ipcRenderer = {
  invoke: jest.fn(async (channel, ...args) => {
    const handler = ipcHandlers.get(channel);
    if (!handler) {
      throw new Error(`No IPC handler registered for "${channel}"`);
    }
    return handler({}, ...args);
  }),
};

const dialog = {
  showSaveDialog: jest.fn(),
  showOpenDialog: jest.fn(),
  showMessageBox: jest.fn(),
};

class BrowserWindow {
  constructor() {
    this.webContents = {
      executeJavaScript: jest.fn(),
    };
  }

  loadURL = jest.fn();
  on = jest.fn();
  show = jest.fn();
  close = jest.fn();

  static fromWebContents() {
    return new BrowserWindow();
  }
}

module.exports = {
  ipcMain,
  ipcRenderer,
  dialog,
  BrowserWindow,
  app: {
    whenReady: jest.fn().mockResolvedValue(),
    on: jest.fn(),
    quit: jest.fn(),
  },
};
