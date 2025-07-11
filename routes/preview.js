console.log('[INFO] Reached file: preview.js');


const express = require('express');
const fs = require('fs');
const path = require('path');

const {
  cleanAndFilterAndFormatKeys,
  classifyFieldTypes,
  safeValue,
} = require('../utils/helpers');

const {
  isAllSameValue,
  checkSpecialPattern,
} = require('../utils/significanceCheck');

const { writeCertificateData } = require('../utils/writeCertificateDetails');

const router = express.Router();
require('dotenv').config();

// Set up user-writable folders
const baseDir = process.cwd();
const uploadsDir = path.join(baseDir, 'uploads');
const dataDir = path.join(baseDir, 'data');

try {
  fs.mkdirSync(uploadsDir, { recursive: true });
  console.log(`[INFO] Ensured uploads directory: ${uploadsDir}`);
} catch (err) {
  console.error('[ERROR] Creating uploads directory:', uploadsDir, err);
}
try {
  fs.mkdirSync(dataDir, { recursive: true });
  console.log(`[INFO] Ensured data directory: ${dataDir}`);
} catch (err) {
  console.error('[ERROR] Creating data directory:', dataDir, err);
}

router.get('/', async (req, res) => {
  const date = new Date();
  const currentYear = date.getFullYear();
  const formattedDate = date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  const formData = {
    workOrderNo: req.query.workOrderNo,
    operator: req.query.operator,
    acReg: req.query.acReg,
    typeOfAC: req.query.typeOfAC,
    dateOfDumping: req.query.dateOfDumping,
    dataReceivedFrom: req.query.dataReceivedFrom,
    fdrPnSn: req.query.fdrPnSn,
    dateOfFlight: req.query.dateOfFlight,
    flightSector: req.query.flightSector,
    natureOfReadout: req.query.natureOfReadout,
    lflRefNo: req.query.lflRefNo,
    noOfParametersRecorded: req.query.noOfParametersRecorded,
    noOfParametersSubmitted: req.query.noOfParametersSubmitted,
  };

  let counterValue;
  try {
    counterValue = writeCertificateData(formData);
    console.log('[INFO] Wrote certificate data for:', formData.acReg);
  } catch (err) {
    console.error('[ERROR] Writing to CSV:', err.message);
    return res
      .status(500)
      .send(
        'The certificate data could not be saved. Please ensure the CSV file is not open.'
      );
  }

  const certificateRefNo = `${counterValue}/${currentYear}`;

  const signature1Path = path.join(
    __dirname,
    '..',
    'public',
    'images',
    'sasi-signature.png'
  );
  const signature2Path = path.join(
    __dirname,
    '..',
    'public',
    'images',
    'achhuth-signature.png'
  );
  const logoPath = path.join(
    __dirname,
    '..',
    'public',
    'images',
    'nestlogo.svg'
  );

  let signature1URI = '',
    signature2URI = '',
    logoURI = '';

  try {
    if (fs.existsSync(signature1Path)) {
      signature1URI = `data:image/png;base64,${fs.readFileSync(signature1Path, 'base64')}`;
      console.log('[INFO] Loaded:', signature1Path);
    } else {
      console.warn('[WARN] Signature 1 image not found:', signature1Path);
    }
    if (fs.existsSync(signature2Path)) {
      signature2URI = `data:image/png;base64,${fs.readFileSync(signature2Path, 'base64')}`;
      console.log('[INFO] Loaded:', signature2Path);
    } else {
      console.warn('[WARN] Signature 2 image not found:', signature2Path);
    }
    if (fs.existsSync(logoPath)) {
      logoURI = `data:image/svg+xml;base64,${fs.readFileSync(logoPath, 'base64')}`;
      console.log('[INFO] Loaded:', logoPath);
    } else {
      console.warn('[WARN] Logo image not found:', logoPath);
    }
  } catch (err) {
    console.error('[ERROR] Reading image files:', err);
  }

  const templatePath = path.join(__dirname, '..', 'templates', 'template.html');
  let html = '';
  try {
    console.log('[INFO] Attempting to load template:', templatePath);
    html = fs.readFileSync(templatePath, 'utf-8');
    console.log('[INFO] Loaded template file.');
  } catch (err) {
    console.error('[ERROR] Reading template file:', templatePath, err);
    return res.status(500).send('Template file missing or unreadable.');
  }

  html = html
    .replace('{{workOrderNo}}', formData.workOrderNo || 'Enter')
    .replace(/{{operator}}/g, formData.operator || 'Enter')
    .replace(/{{acReg}}/g, formData.acReg || 'Enter')
    .replace(/{{typeOfAC}}/g, formData.typeOfAC || 'Enter')
    .replace('{{dateOfDumping}}', formData.dateOfDumping || 'Enter')
    .replace('{{dataReceivedFrom}}', formData.dataReceivedFrom || 'Enter')
    .replace('{{fdrPnSn}}', formData.fdrPnSn || 'Enter')
    .replace('{{dateOfFlight}}', formData.dateOfFlight || 'Enter')
    .replace('{{flightSector}}', formData.flightSector || 'Enter')
    .replace('{{natureOfReadout}}', formData.natureOfReadout || 'Enter')
    .replace('{{lflRefNo}}', formData.lflRefNo || 'Enter')
    .replace(
      '{{noOfParametersRecorded}}',
      formData.noOfParametersRecorded || 'Enter'
    )
    .replace(
      '{{noOfParametersSubmitted}}',
      formData.noOfParametersSubmitted || 'Enter'
    )
    .replace('{{certificateRefNo}}', certificateRefNo)
    .replace('{{currentDate}}', formattedDate)
    .replace('{{signature1}}', signature1URI)
    .replace('{{signature2}}', signature2URI)
    .replace('{{logo}}', logoURI);

  const operatorInfoPath = path.join(
    __dirname,
    '..',
    'public',
    'data',
    'operator info.json'
  );
  let operatorData = {};
  try {
    console.log('[INFO] Loading operator info data from:', operatorInfoPath);
    const rawOperatorData = fs.readFileSync(operatorInfoPath, 'utf-8');
    operatorData = JSON.parse(rawOperatorData);
    console.log('[INFO] Loaded operator info data.');
  } catch (error) {
    console.error(
      '[ERROR] Loading operator info data:',
      operatorInfoPath,
      error
    );
  }

  const acRecord = operatorData[formData.acReg] || {};
  const partNumber = safeValue(acRecord['Part Number']);
  const serialNumber = safeValue(acRecord['Serial Number']);
  const noOfParams = safeValue(
    acRecord['No of Parameter submitted for Evaluation']
  );

  html = html
    .replace('{{partNumber}}', partNumber)
    .replace('{{serialNumber}}', serialNumber)
    .replace('{{noOfParams}}', noOfParams)
    .replace('{{description}}', `${partNumber} / ${serialNumber}`);

  let ReportSequenceArray = [];
  try {
    const manifestPath = path.join(uploadsDir, 'manifest.json');
    console.log('[INFO] Looking for manifest:', manifestPath);
    if (fs.existsSync(manifestPath)) {
      ReportSequenceArray = JSON.parse(fs.readFileSync(manifestPath, 'utf-8'));
      console.log('[INFO] Loaded manifest.json:', manifestPath);
    } else {
      console.warn('[WARN] No manifest.json found:', manifestPath);
    }
  } catch (err) {
    console.error('[ERROR] Reading manifest.json:', err);
  }

  let dynamicReadoutTables = '';
  let sNumber = 1;

  for (const baseName of ReportSequenceArray) {
    const jsonFileName = `${baseName}.json`;
    const jsonPath = path.join(uploadsDir, jsonFileName);

    if (!fs.existsSync(jsonPath)) {
      console.warn(`[WARN] Skipped missing file: ${jsonFileName}`);
      continue;
    }

    let reportData;
    try {
      reportData = JSON.parse(fs.readFileSync(jsonPath, 'utf-8'));
      console.log(`[INFO] Loaded report data for: ${jsonFileName}`);
    } catch (err) {
      console.error(`[ERROR] Parsing JSON for ${jsonFileName}:`, err);
      continue;
    }

    const report = reportData.find((f) => f.file === `${baseName}.csv`);
    if (!report) {
      console.warn(`[WARN] No matching report entry for ${baseName}.csv`);
      continue;
    }

    const content = report?.[`${baseName} Content`] || [];
    if (content.length === 0) {
      console.warn(`[WARN] No content found for ${baseName}`);
      continue;
    }

    console.log(`[INFO] Processing report: ${baseName}.csv`);

    const rawKeys = Object.keys(content[0]);
    const cleanedKeys = cleanAndFilterAndFormatKeys(rawKeys);

    const rowWiseFieldTypes = content.map((row, idx) => ({
      rowIndex: idx,
      fieldTypes: classifyFieldTypes(row),
    }));

    const fieldTypeCounts = {};
    for (const row of rowWiseFieldTypes) {
      for (const [key, type] of Object.entries(row.fieldTypes)) {
        if (!fieldTypeCounts[key]) {
          fieldTypeCounts[key] = { Variable: 0, Discrete: 0, Enter: 0 };
        }
        fieldTypeCounts[key][type]++;
      }
    }

    const overallFieldTypes = {};
    for (const [key, counts] of Object.entries(fieldTypeCounts)) {
      overallFieldTypes[key] = {
        type:
          counts.Variable > 0
            ? 'Variable'
            : counts.Discrete > 0
              ? 'Discrete'
              : 'Enter',
        count: counts,
      };
    }

    const tableRows = rawKeys
      .map((rawKey, index) => {
        const cleanedKey = cleanedKeys[index];
        const paramInfo = overallFieldTypes[rawKey] || {};
        const parameterType = paramInfo.type || '';

        const values = content.map((row) => row[rawKey]);
        const { isAllSame, sameValue } = isAllSameValue(values);
        const { usePattern, patternValue } = checkSpecialPattern(values);

        const remark =
          isAllSame || usePattern
            ? `Always "${isAllSame ? sameValue : patternValue}"`
            : '';

        return `
        <tr>
          <td>${sNumber++}</td>
          <td contenteditable="true">${cleanedKey}</td>
          <td contenteditable="true">${parameterType}</td>
          <td contenteditable="true">${isAllSame || usePattern ? '' : '✔'}</td>
          <td contenteditable="true">${isAllSame || usePattern ? '✔' : ''}</td>
          <td contenteditable="true"></td>
          <td contenteditable="true"></td>
          <td contenteditable="true">${remark}</td>
        </tr>
      `;
      })
      .join('');

    dynamicReadoutTables += `
      <tr>
        <td colspan="8" class="readout-header">${baseName}</td>
      </tr>
      ${tableRows}
    `;
  }

  html = html.replace('{{dynamicReadoutTables}}', dynamicReadoutTables);

  res.send(html);
});

module.exports = router;
