// preload.js
const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  onFind: (callback) => ipcRenderer.on('trigger-find', callback),
  clearUploads: () => ipcRenderer.invoke('clear-uploads'),
});
