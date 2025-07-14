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
  // Read existing data (rows are arrays, without header)
  const currentData = readCSVFile();

  // Determine next certificateRefNo based on the last row, not just the count
  let nextCounter = 1; // default starting value
  if (currentData.length > 0) {
    const lastRow = currentData[currentData.length - 1];
    // Defensive: try to parse the previous ref number
    const lastRef = parseInt(lastRow[1], 10);
    if (!isNaN(lastRef)) {
      nextCounter = lastRef + 1;
    }
  }

  /* 
  
  How to Force Excel to Show Seconds
    Change the Cell Format

    Select the entire column (with timestamps).

    Right-click → Format Cells.

    Go to Custom.

    Enter the format: yyyy-mm-dd hh:mm:ss
    
    Click OK. Now all times will show seconds!
  
  */
  // Get IST timestamp
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
    fs.appendFileSync(csvFilePath, csvRow);
    console.log(`[INFO] Appended new row to CSV: ${csvFilePath}`);
    console.log('[INFO] Row data:', newRow);
  } catch (err) {
    console.error(`[ERROR] Appending row to CSV: ${csvFilePath}`, err);
    throw err;
  }

  return nextCounter;
}

module.exports = {
  writeCertificateData,
};
