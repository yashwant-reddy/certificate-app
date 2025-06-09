// Import modules
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

router.get('/', async (req, res) => {
  const date = new Date();
  const currentYear = date.getFullYear();
  const formattedDate = date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  // Extract form data from query
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

  // Write certificate data to CSV and get counter
  const counterValue = writeCertificateData(formData);
  const certificateRefNo = `${counterValue}/${currentYear}`;

  // Load signature and logo images as base64 URIs
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
    }
    if (fs.existsSync(signature2Path)) {
      signature2URI = `data:image/png;base64,${fs.readFileSync(signature2Path, 'base64')}`;
    }
    if (fs.existsSync(logoPath)) {
      logoURI = `data:image/svg+xml;base64,${fs.readFileSync(logoPath, 'base64')}`;
    }
  } catch (err) {
    console.error('Error reading image files:', err);
  }

  // Load HTML template
  const templatePath = path.join(__dirname, '..', 'templates', 'template.html');
  let html = fs.readFileSync(templatePath, 'utf-8');

  // Replace placeholders for form data & certificate number
  html = html
    .replace('{{workOrderNo}}', formData.workOrderNo || 'Update')
    .replace(/{{operator}}/g, formData.operator || 'Update')
    .replace(/{{acReg}}/g, formData.acReg || 'Update')
    .replace(/{{typeOfAC}}/g, formData.typeOfAC || 'Update')
    .replace('{{dateOfDumping}}', formData.dateOfDumping || 'Update')
    .replace('{{dataReceivedFrom}}', formData.dataReceivedFrom || 'Update')
    .replace('{{fdrPnSn}}', formData.fdrPnSn || 'Update')
    .replace('{{dateOfFlight}}', formData.dateOfFlight || 'Update')
    .replace('{{flightSector}}', formData.flightSector || 'Update')
    .replace('{{natureOfReadout}}', formData.natureOfReadout || 'Update')
    .replace('{{lflRefNo}}', formData.lflRefNo || 'Update')
    .replace(
      '{{noOfParametersRecorded}}',
      formData.noOfParametersRecorded || 'Update'
    )
    .replace(
      '{{noOfParametersSubmitted}}',
      formData.noOfParametersSubmitted || 'Update'
    )
    .replace('{{certificateRefNo}}', certificateRefNo)
    .replace('{{currentDate}}', formattedDate)
    .replace('{{signature1}}', signature1URI)
    .replace('{{signature2}}', signature2URI)
    .replace('{{logo}}', logoURI);

  // --- Load aircraft registration data from operator info.json (independent from certificate data) ---
  const operatorInfoPath = path.join(
    __dirname,
    '..',
    'public',
    'data',
    'operator info.json'
  );
  let operatorData = {};
  try {
    const rawOperatorData = fs.readFileSync(operatorInfoPath, 'utf-8');
    operatorData = JSON.parse(rawOperatorData);
  } catch (error) {
    console.error('Error loading operator info data:', error);
  }

  // Lookup acReg details
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

  // --- The rest: building dynamic readout tables from manifest.json and Readout Report JSON files ---

  let ReportSequenceArray = [];
  try {
    const manifestPath = path.join(__dirname, '..', 'uploads', 'manifest.json');
    ReportSequenceArray = JSON.parse(fs.readFileSync(manifestPath, 'utf-8'));
  } catch (err) {
    console.error('Error reading manifest.json:', err);
  }

  let dynamicReadoutTables = '';
  let sNumber = 1;

  for (const i of ReportSequenceArray) {
    const jsonPath = path.join(
      __dirname,
      '..',
      'uploads',
      `Readout Report ${i}.json`
    );
    if (!fs.existsSync(jsonPath)) continue;

    const reportData = JSON.parse(fs.readFileSync(jsonPath, 'utf-8'));
    const report = reportData.find((f) => f.file === `Readout Report ${i}.csv`);
    const content = report?.[`Readout Report ${i} Content`] || [];
    if (content.length === 0) continue;

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
          fieldTypeCounts[key] = { Variable: 0, Discrete: 0, Update: 0 };
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
              : 'Update',
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
        <td colspan="8" class="readout-header">Readout Report ${i}</td>
      </tr>
      ${tableRows}
    `;
  }

  html = html.replace('{{dynamicReadoutTables}}', dynamicReadoutTables);

  res.send(html);
});

module.exports = router;
