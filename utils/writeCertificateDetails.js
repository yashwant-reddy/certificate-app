const fs = require('fs');
const path = require('path');
const { stringify } = require('csv-stringify/sync');

const csvFilePath = path.join(
  __dirname,
  '..',
  'public',
  'data',
  'CertificateRefNumberDetails.csv'
);

// Ensure directory exists
const dir = path.dirname(csvFilePath);
if (!fs.existsSync(dir)) {
  fs.mkdirSync(dir, { recursive: true });
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
    // Create file with headers
    const headerRow = stringify([csvHeaders]);
    fs.writeFileSync(csvFilePath, headerRow);
    return [];
  }

  const raw = fs.readFileSync(csvFilePath, 'utf-8').trim();
  if (!raw) return [];

  const rows = raw.split('\n').slice(1); // skip header
  return rows.map((line) => line.split(','));
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

  const csvRow = stringify([newRow]);
  fs.appendFileSync(csvFilePath, csvRow);

  return nextCounter; // Just the integer
}

module.exports = {
  writeCertificateData,
};
