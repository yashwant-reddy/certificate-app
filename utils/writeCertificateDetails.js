const fs = require('fs');
const path = require('path');
const { stringify } = require('csv-stringify/sync');

const dataDir = path.join(process.cwd(), 'data');
const csvFilePath = path.join(dataDir, 'CertificateRefNumberDetails.csv');

// Ensure directory exists
if (!fs.existsSync(dataDir)) {
  try {
    fs.mkdirSync(dataDir, { recursive: true });
    console.log(`[INFO] Created data directory: ${dataDir}`);
  } catch (err) {
    console.error(`[ERROR] Creating data directory: ${dataDir}`, err);
  }
}

// Define CSV headers
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

// Helper: Read existing data
function readCSVFile() {
  if (!fs.existsSync(csvFilePath)) {
    try {
      // Create file with headers
      const headerRow = stringify([csvHeaders]);
      fs.writeFileSync(csvFilePath, headerRow);
      console.log(`[INFO] Created new CSV with headers: ${csvFilePath}`);
      return [];
    } catch (err) {
      console.error(`[ERROR] Creating CSV file: ${csvFilePath}`, err);
      return [];
    }
  }

  try {
    const raw = fs.readFileSync(csvFilePath, 'utf-8').trim();
    if (!raw) {
      console.warn(`[WARN] CSV file is empty: ${csvFilePath}`);
      return [];
    }

    const rows = raw.split('\n').slice(1); // skip header
    return rows.map((line) => line.split(','));
  } catch (err) {
    console.error(`[ERROR] Reading CSV file: ${csvFilePath}`, err);
    return [];
  }
}

// Write certificate entry and return integer reference number
function writeCertificateData(formData) {
  const currentData = readCSVFile();
  const nextCounter = currentData.length + 1;

  const timestamp = new Date().toISOString();

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
    fs.appendFileSync(csvFilePath, csvRow);
    console.log(`[INFO] Appended new row to CSV: ${csvFilePath}`);
    console.log('[INFO] Row data:', newRow);
  } catch (err) {
    console.error(`[ERROR] Appending row to CSV: ${csvFilePath}`, err);
    throw err;
  }

  return nextCounter; // Just the integer
}

module.exports = {
  writeCertificateData,
};
