// utils/certificateRefStore.js
const fs = require('fs');
const path = require('path');
const { stringify } = require('csv-stringify/sync');

// --- NETWORK AND LOCAL PATHS ---
// const networkDataDir = '\\\\10.15.8.151\\Nest Application\\certificate-app\\data';
const networkDataDir = '\\\\10.15.0.85\\BLR-ABU-Data\\Nest Application\\certificate-app\\data';
const networkCsvFilePath = path.join(networkDataDir, 'CertificateRefNumberDetails.csv');

const localDataDir = path.join(process.cwd(), 'data');
const localCsvFilePath = path.join(localDataDir, 'CertificateRefNumberDetails.csv');

const csvHeaders = [
  'timestamp',
  'certificateRefNo',
  'workOrderNo',
  'operator',
  'acReg',
  'typeOfAC',
  'dateOfDumping',
  'dataReceivedFrom',
  'fdrPnSn',
  'dateOfFlight',
  'flightSector',
  'natureOfReadout',
  'lflRefNo',
  'noOfParametersRecorded',
  'noOfParametersSubmitted',
];

// --- PATH DETECTION AND FALLBACK ---
function ensureCsvAndGetPath() {
  // Try network path first
  try {
    if (!fs.existsSync(networkDataDir)) {
      fs.mkdirSync(networkDataDir, { recursive: true });
    }
    if (!fs.existsSync(networkCsvFilePath)) {
      const headerRow = stringify([csvHeaders]);
      fs.writeFileSync(networkCsvFilePath, headerRow);
      console.log(`[INFO] Created new CSV with headers on network: ${networkCsvFilePath}`);
    }
    fs.accessSync(networkCsvFilePath, fs.constants.R_OK | fs.constants.W_OK);
    return networkCsvFilePath;
  } catch {
    // fallback to local
    try {
      if (!fs.existsSync(localDataDir)) {
        fs.mkdirSync(localDataDir, { recursive: true });
      }
      if (!fs.existsSync(localCsvFilePath)) {
        const headerRow = stringify([csvHeaders]);
        fs.writeFileSync(localCsvFilePath, headerRow);
        console.log(`[INFO] Created new CSV with headers locally: ${localCsvFilePath}`);
      }
      fs.accessSync(localCsvFilePath, fs.constants.R_OK | fs.constants.W_OK);
    } catch (e) {
      console.error(`[ERROR] Creating local data directory or CSV: ${localDataDir}`, e);
    }
    return localCsvFilePath;
  }
}

function readAllRows(filePath) {
  if (!fs.existsSync(filePath)) return [];
  const raw = fs.readFileSync(filePath, 'utf-8').trim();
  if (!raw) return [];
  const lines = raw.split('\n').slice(1); // skip header
  return lines.filter(Boolean).map((line) => line.split(','));
}

// --- IST Timestamp ---
function getISTTimestamp() {
  const now = new Date();
  const options = {
    timeZone: 'Asia/Kolkata',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  };
  let parts = new Intl.DateTimeFormat('en-GB', options).formatToParts(now);
  let obj = {};
  parts.forEach(({ type, value }) => (obj[type] = value));
  return `${obj.year}-${obj.month}-${obj.day} ${obj.hour}:${obj.minute}:${obj.second}`;
}

/**
 * Peek the next certificate number WITHOUT writing anything.
 * Safe to call to display a hint in UI like "Will assign on print".
 */
function getNextRefNumber() {
  const filePath = ensureCsvAndGetPath();
  const rows = readAllRows(filePath);
  if (rows.length === 0) return 1;

  // last valid numeric ref from last non-empty row
  for (let i = rows.length - 1; i >= 0; i--) {
    const n = parseInt(rows[i][1], 10);
    if (!Number.isNaN(n)) return n + 1;
  }
  return 1;
}

/**
 * Commit a row to the CSV.
 * If refNoOverride is provided, that exact number is written (use for print-time assignment).
 */
function writeCertificateData(formData, refNoOverride) {
  const filePath = ensureCsvAndGetPath();
  const rows = readAllRows(filePath);

  let nextCounter;
  if (typeof refNoOverride === 'number' && refNoOverride > 0) {
    nextCounter = refNoOverride;
  } else {
    // fallback: compute from last row
    nextCounter = 1;
    if (rows.length > 0) {
      for (let i = rows.length - 1; i >= 0; i--) {
        const lastRef = parseInt(rows[i][1], 10);
        if (!Number.isNaN(lastRef)) {
          nextCounter = lastRef + 1;
          break;
        }
      }
    }
  }

  const timestamp = getISTTimestamp();
  const newRow = [
    timestamp,
    nextCounter,
    formData.workOrderNo || '',
    formData.operator || '',
    formData.acReg || '',
    formData.typeOfAC || '',
    formData.dateOfDumping || '',
    formData.dataReceivedFrom || '',
    formData.fdrPnSn || '',
    formData.dateOfFlight || '',
    formData.flightSector || '',
    formData.natureOfReadout || '',
    formData.lflRefNo || '',
    formData.noOfParametersRecorded || '',
    formData.noOfParametersSubmitted || '',
  ];

  const csvRow = stringify([newRow]);
  fs.appendFileSync(filePath, csvRow);
  console.log(`[INFO] Appended new certificate row #${nextCounter} to: ${filePath}`);
  return nextCounter;
}

module.exports = {
  getNextRefNumber,
  writeCertificateData,
};
