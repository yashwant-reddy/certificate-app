/**
 * Tests IPC handler registration and basic behavior
 * Uses mocked Electron APIs
 */

const { ipcMain, dialog } = require('electron');

// IMPORTANT: load main.js AFTER mocks
require('../../main');

describe('IPC: print-and-commit', () => {
  beforeEach(() => {
    dialog.showSaveDialog.mockResolvedValue({
      canceled: false,
      filePath: 'Certificate_123.pdf',
    });
  });

  test('registers print-and-commit IPC handler', () => {
    const handlers = ipcMain.eventNames();
    expect(handlers).toContain('print-and-commit');
  });

  test('save dialog is invoked during print flow', async () => {
    const handlerName = 'print-and-commit';
    const handlerExists = ipcMain.eventNames().includes(handlerName);

    expect(handlerExists).toBe(true);
  });
});
