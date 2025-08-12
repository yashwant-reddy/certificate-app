const fs = require('fs');
const path = require('path');
const { stringify } = require('csv-stringify/sync');

// --- NETWORK AND LOCAL PATHS ---
// const networkDataDir = '\\\\10.15.8.151\\Nest Application\\certificate-app\\data'; // <--- adjust share path as needed
const networkDataDir = '\\\\10.15.0.85\\BLR-ABU-Data\\Nest Application\\certificate-app\\data'; // <--- adjust share path as needed
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
function getCsvFilePath() {
  // Try network path first
  try {
    if (!fs.existsSync(networkDataDir)) {
      fs.mkdirSync(networkDataDir, { recursive: true });
    }
    // --- Try to create the file with headers if missing
    if (!fs.existsSync(networkCsvFilePath)) {
      const headerRow = stringify([csvHeaders]);
      fs.writeFileSync(networkCsvFilePath, headerRow);
      console.log(`[INFO] Created new CSV with headers on network: ${networkCsvFilePath}`);
    }
    // Test R/W now that file is ensured
    fs.accessSync(networkCsvFilePath, fs.constants.R_OK | fs.constants.W_OK);
    return networkCsvFilePath;
  } catch (err) {
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
    } catch (e) {
      console.error(`[ERROR] Creating local data directory or CSV: ${localDataDir}`, e);
    }
    return localCsvFilePath;
  }
}


// --- READ CSV DATA ---
function readCSVFile() {
  const filePath = getCsvFilePath();

  if (!fs.existsSync(filePath)) {
    try {
      // Create file with headers
      const headerRow = stringify([csvHeaders]);
      fs.writeFileSync(filePath, headerRow);
      console.log(`[INFO] Created new CSV with headers: ${filePath}`);
      return [];
    } catch (err) {
      console.error(`[ERROR] Creating CSV file: ${filePath}`, err);
      return [];
    }
  }

  try {
    const raw = fs.readFileSync(filePath, 'utf-8').trim();
    if (!raw) {
      console.warn(`[WARN] CSV file is empty: ${filePath}`);
      return [];
    }
    const rows = raw.split('\n').slice(1); // skip header
    return rows.map((line) => line.split(','));
  } catch (err) {
    console.error(`[ERROR] Reading CSV file: ${filePath}`, err);
    return [];
  }
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
  parts.forEach(({ type, value }) => {
    obj[type] = value;
  });
  // Assemble as YYYY-MM-DD HH:mm:ss
  return `${obj.year}-${obj.month}-${obj.day} ${obj.hour}:${obj.minute}:${obj.second}`;
}

// --- MAIN EXPORTED METHOD ---
function writeCertificateData(formData) {
  const filePath = getCsvFilePath();
  const currentData = readCSVFile();

  // Determine next certificateRefNo based on last valid row
  let nextCounter = 1;
  if (currentData.length > 0) {
    const lastRow = currentData[currentData.length - 1];
    const lastRef = parseInt(lastRow[1], 10);
    if (!isNaN(lastRef)) {
      nextCounter = lastRef + 1;
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

  try {
    const csvRow = stringify([newRow]);
    fs.appendFileSync(filePath, csvRow);
    console.log(`[INFO] Appended new row to CSV: ${filePath}`);
    console.log('[INFO] Row data:', newRow);
  } catch (err) {
    console.error(`[ERROR] Appending row to CSV: ${filePath}`, err);
    throw err;
  }

  return nextCounter;
}

module.exports = {
  writeCertificateData,
};
