// preload.js
const { contextBridge, ipcRenderer } = require('electron');

/** --------- Helpers to read values from the preview DOM ---------- **/
function byIdText(id) {
  const el = document.getElementById(id);
  if (!el) return '';
  if ('value' in el && typeof el.value === 'string') return el.value.trim();
  return (el.textContent || '').trim();
}

function collectFormDataFromDOM() {
  const data = {
    workOrderNo: byIdText('workOrderNo'),
    operator: byIdText('operator'),
    acReg: byIdText('acReg'),
    typeOfAC: byIdText('typeOfAC'),
    dateOfDumping: byIdText('dateOfDumping'),
    dataReceivedFrom: byIdText('dataReceivedFrom'),
    fdrPnSn: byIdText('fdrPnSn'),
    dateOfFlight: byIdText('dateOfFlight'),
    flightSector: byIdText('flightSector'),
    natureOfReadout: byIdText('natureOfReadout'),
    lflRefNo: byIdText('lflRefNo'),
    noOfParametersRecorded: byIdText('noOfParametersRecorded'),
    noOfParametersSubmitted: byIdText('noOfParametersSubmitted'),
  };
  console.log('[PRELOAD] collectFormDataFromDOM ->', data);
  return data;
}

/** --------- Expose your existing API (unchanged) ---------- **/
contextBridge.exposeInMainWorld('electronAPI', {
  onFind: (callback) => ipcRenderer.on('trigger-find', callback),
  clearUploads: () => ipcRenderer.invoke('clear-uploads'),
});

/** --------- New: print flow API (wrapped with debug logs) ---------- **/
contextBridge.exposeInMainWorld('printAPI', {
  // Subscribe to menu/Ctrl+P from main.js
  onHotkeyPrint: (callback) => {
    console.log('[PRELOAD] printAPI.onHotkeyPrint: listener registered');
    ipcRenderer.on('hotkey-print', (...args) => {
      console.log('[PRELOAD] hotkey-print received from main');
      callback?.(...args);
    });
  },

  // Manually request print+commit with arbitrary formData
  printAndCommit: async (formData) => {
    const payload = {
      ...collectFormDataFromDOM(), // always include DOM data
      ...(formData || {})          // override/add extras like fileName
    };
    console.log('[PRELOAD] printAPI.printAndCommit invoked with:', payload);
    try {
      const res = await ipcRenderer.invoke('print-and-commit', payload);
      console.log('[PRELOAD] printAPI.printAndCommit result:', res);
      return res;
    } catch (e) {
      console.error('[PRELOAD] printAPI.printAndCommit ERROR:', e);
      throw e;
    }
  },
});

/** --------- DOM hook for ref number injection (used by main.js) ---------- **/
window.__setCertificateRefNo = function (valueOrNull) {
  const refEl = document.getElementById('certificateRefNo');
  if (!refEl) {
    console.warn('[PRELOAD] __setCertificateRefNo: #certificateRefNo not found');
    return;
  }
  if (valueOrNull == null) {
    console.log('[PRELOAD] __setCertificateRefNo: resetting placeholder');
    refEl.textContent = '(will assign on print)';
  } else {
    console.log('[PRELOAD] __setCertificateRefNo: injecting ref =', valueOrNull);
    refEl.textContent = String(valueOrNull);
  }
};

/** --------- Auto-wire Ctrl+P/menu to the print flow with logs ---------- **/
ipcRenderer.on('hotkey-print', async () => {
  console.log('[PRELOAD] hotkey-print handler: starting print-and-commit flow');
  const formData = collectFormDataFromDOM();
  try {
    const res = await ipcRenderer.invoke('print-and-commit', formData);
    console.log('[PRELOAD] hotkey print flow completed:', res);
    if (!res?.ok) {
      console.warn('[PRELOAD] Print cancelled or failed:', res?.reason || 'unknown');
    }
  } catch (e) {
    console.error('[PRELOAD] hotkey print flow ERROR:', e);
  }
});

/** --------- EXTRA DEBUG: log clicks on Print button(s) ---------- **/
// Logs when an element with id="printButton" or data-action="print" is clicked
window.addEventListener(
  'click',
  (e) => {
    const t = e.target;
    const isPrintById = t && (t.id === 'printButton' || t.closest?.('#printButton'));
    const isPrintByData = t && (t.dataset?.action === 'print' || t.closest?.('[data-action="print"]'));
    if (isPrintById || isPrintByData) {
      console.log('[PRELOAD] Print button clicked:', {
        targetId: t.id,
        targetTag: t.tagName,
        dataAction: t.dataset?.action,
      });
    }
  },
  true // capture to log even if the app stops propagation
);

console.log('[PRELOAD] preload loaded & ready');
