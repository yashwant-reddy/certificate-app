console.log('[INFO] Reached file: preview.js (MERGED MODE)');

const express = require('express');
const multer = require('multer');
const csv = require('csv-parser');
const fs = require('fs');
const path = require('path');

const {
  cleanAndFilterAndFormatKeys,
  classifyFieldTypes,
  safeValue,
  cleanAcReg,
} = require('../utils/helpers');

const {
  isAllSameValue,
  checkSpecialPattern,
} = require('../utils/significanceCheck');

const {
  writeCertificateData,
  getNextRefNumber,
} = require('../utils/writeCertificateDetails');

const removeSubframeIndexFromReport1 = require('../utils/removeSubframeIndex');

const router = express.Router();
const upload = multer({ dest: 'uploads/' });
require('dotenv').config();

const baseDir = process.cwd();
const uploadsDir = path.join(baseDir, 'uploads');
const dataDir = path.join(baseDir, 'data');

// Ensure required directories exist
try {
  fs.mkdirSync(uploadsDir, { recursive: true });
} catch (err) { console.error('[ERROR] Directory:', err); }
try {
  fs.mkdirSync(dataDir, { recursive: true });
} catch (err) { console.error('[ERROR] Directory:', err); }

function isStandalone1File(filename) {
  if (!filename) return false;
  const baseName = path.parse(filename).name;
  return /(^|[^\d])1(\D|$)/.test(baseName);
}

router.post('/', upload.array('files'), async (req, res) => {
  // ---------- 1. FILE UPLOAD + CSV PROCESSING ----------
  const files = req.files || [];
  const allResults = {};
  const firstObjects = {};

  if (files.length > 0) {
    await Promise.all(
      files.map((file) => {
        return new Promise((resolve, reject) => {
          const results = [];
          const originalName = file.originalname;
          const filePath = file.path;

          fs.createReadStream(filePath)
            .pipe(csv())
            .on('data', (data) => results.push(data))
            .on('end', () => {
              allResults[originalName] = results;
              if (results.length > 0) firstObjects[originalName] = results[0];
              try { fs.unlinkSync(filePath); } catch (err) { }
              resolve();
            })
            .on('error', reject);
        });
      })
    );

    // Step 2: Natural Sort (1, 2, 4a, 4b, Alpha...)
    const uploadedBaseNames = Object.keys(allResults).map(name => path.parse(name).name.trim());
    function customSort(a, b) {
      const groupRegex = /^Group\s*(\d+)([a-zA-Z]?)/i;

      const aMatch = a.match(groupRegex);
      const bMatch = b.match(groupRegex);

      if (aMatch && bMatch) {
        const numA = parseInt(aMatch[1]);
        const numB = parseInt(bMatch[1]);

        if (numA !== numB) return numA - numB;

        return (aMatch[2] || '').localeCompare(bMatch[2] || '');
      }

      if (aMatch) return -1;
      if (bMatch) return 1;

      return a.localeCompare(b);
    }

    const sortedBaseNames = uploadedBaseNames.sort(customSort);

    // Step 3: Identify Primary File
    let primaryBaseName = sortedBaseNames.find(name => {
      const originalFullName = Object.keys(allResults).find(fullName => path.parse(fullName).name.trim() === name);
      return isStandalone1File(originalFullName);
    }) || sortedBaseNames[0];

    const masterKeyInAllResults = Object.keys(allResults).find(name => path.parse(name).name.trim() === primaryBaseName);

    // Step 4: Master Cleaning
    if (masterKeyInAllResults && allResults[masterKeyInAllResults]) {
      allResults[masterKeyInAllResults] = removeSubframeIndexFromReport1(allResults[masterKeyInAllResults], masterKeyInAllResults);
      if (allResults[masterKeyInAllResults].length > 0) {
        firstObjects[masterKeyInAllResults] = allResults[masterKeyInAllResults][0];
      }
    }

    // Step 5: Global Filtering & Redundancy Removal (FIXED)
    const normalizeKey = (key) => key.trim().toLowerCase();
    const SUBFRAME_KEY = "subframe index";

    // Start with master keys
    const globalSeenKeys = new Set(
      Object.keys(firstObjects[masterKeyInAllResults] || {}).map(k => normalizeKey(k))
    );

    const filteredResults = {};

    for (const baseName of sortedBaseNames) {
      const fileName = Object.keys(allResults).find(
        name => path.parse(name).name.trim() === baseName
      );

      const rows = allResults[fileName];
      const isMaster = (fileName === masterKeyInAllResults);

      const removedKeysSet = new Set();

      filteredResults[fileName] = rows.map((row) => {
        const filtered = {};

        for (const key in row) {
          const nKey = normalizeKey(key);

          // RULE 1: remove Subframe Index everywhere
          if (nKey === SUBFRAME_KEY) {
            removedKeysSet.add(key);
            continue;
          }

          // RULE 2: remove already seen keys
          if (!isMaster && globalSeenKeys.has(nKey)) {
            removedKeysSet.add(key);
            continue;
          }

          filtered[key.trim()] = row[key];
        }

        return filtered;
      });

      // Log removed keys
      console.log(` ${baseName}: removed keys ->`, [...removedKeysSet]);

      // Add current file keys AFTER processing
      const firstRow = filteredResults[fileName][0] || {};
      Object.keys(firstRow).forEach(k => globalSeenKeys.add(normalizeKey(k)));
    }

    // Step 6: Write JSONs
    for (const [fileName, rows] of Object.entries(filteredResults)) {
      const baseName = path.parse(fileName).name;
      fs.writeFileSync(path.join(uploadsDir, `${baseName}.json`), JSON.stringify([{ file: fileName, [`${baseName} Content`]: rows }], null, 2));
    }

    // Step 7: Save Manifest
    fs.writeFileSync(path.join(uploadsDir, "manifest.json"), JSON.stringify(sortedBaseNames, null, 2));
  }

  // ---------- 2. CERTIFICATE PREVIEW GENERATION ----------
  const date = new Date();
  const formattedDate = date.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
  const formData = { ...req.body };
  const certificateRefNo = `${getNextRefNumber()}/${date.getFullYear()}`;

  // Image handling
  const imgFolder = path.join(__dirname, '..', 'public', 'images');
  const getBase64 = (p) => fs.existsSync(p) ? `data:image/png;base64,${fs.readFileSync(p, 'base64')}` : '';
  const signature1 = getBase64(path.join(imgFolder, 'sasi-signature.png'));
  const signature2 = getBase64(path.join(imgFolder, 'achhuth-signature.png'));
  const logo = getBase64(path.join(imgFolder, 'NestLogo.png'));

  // Template handling
  let html = '';
  try {
    html = fs.readFileSync(path.join(__dirname, '..', 'templates', 'template.html'), 'utf-8');
  } catch (err) {
    console.error('[ERROR] Reading template:', err);
    return res.status(500).send('Template file missing or unreadable.');
  }

  // Placeholders replacement
  html = html
    .replace('{{workOrderNo}}', formData.workOrderNo || 'Enter')
    .replace(/{{operator}}/g, formData.operator || 'Enter')
    .replace(/{{acReg}}/g, cleanAcReg(formData.acReg) || 'Enter')
    .replace(/{{typeOfAC}}/g, formData.typeOfAC || 'Enter')
    .replace('{{dateOfDumping}}', formData.dateOfDumping || 'Enter')
    .replace('{{dataReceivedFrom}}', formData.dataReceivedFrom || 'Enter')
    .replace('{{fdrPnSn}}', formData.fdrPnSn || 'Enter')
    .replace('{{dateOfFlight}}', formData.dateOfFlight || 'Enter')
    .replace('{{flightSector}}', formData.flightSector || 'Enter')
    .replace('{{natureOfReadout}}', formData.natureOfReadout || 'Enter')
    .replace('{{lflRefNo}}', formData.lflRefNo || 'Enter')
    .replace('{{noOfParametersRecorded}}', formData.noOfParametersRecorded || 'Enter')
    .replace('{{noOfParametersSubmitted}}', formData.noOfParametersSubmitted || 'Enter')
    .replace('{{certificateRefNo}}', certificateRefNo)
    .replace('{{currentDate}}', formattedDate)
    .replace('{{signature1}}', signature1)
    .replace('{{signature2}}', signature2)
    .replace('{{logo}}', logo)
    .replace(/{{SourceType}}/g, formData.sourceType || 'FDR')
    .replace('{{partNumber}}', safeValue(formData.partNumber))
    .replace('{{serialNumber}}', safeValue(formData.serialNumber))
    .replace('{{noOfParams}}', safeValue(formData.noOfParametersSubmitted))
    .replace('{{description}}', `${safeValue(formData.partNumber)} / ${safeValue(formData.serialNumber)}`);

  // Build Tables
  let manifest = [];
  try { manifest = JSON.parse(fs.readFileSync(path.join(uploadsDir, 'manifest.json'), 'utf-8')); } catch (e) { }

  let dynamicReadoutTables = '';
  let sNumber = 1;

  for (const baseName of manifest) {
    const jsonPath = path.join(uploadsDir, `${baseName}.json`);
    if (!fs.existsSync(jsonPath)) continue;

    const content = JSON.parse(fs.readFileSync(jsonPath, 'utf-8'))[0][`${baseName} Content`] || [];
    if (content.length === 0) continue;

    const rawKeys = Object.keys(content[0]);
    const cleanedKeys = cleanAndFilterAndFormatKeys(rawKeys);

    // Properly aggregate field types across all rows to support "Enter"
    const fieldTypeCounts = {};
    content.forEach(row => {
      const types = classifyFieldTypes(row);
      Object.entries(types).forEach(([key, type]) => {
        if (!fieldTypeCounts[key]) fieldTypeCounts[key] = { Variable: 0, Discrete: 0, Enter: 0 };
        fieldTypeCounts[key][type]++;
      });
    });

    // Table Generation
    const tableRows = rawKeys.map((rawKey, index) => {
      const values = content.map(r => r[rawKey]);
      const { isAllSame, sameValue } = isAllSameValue(values);
      const { usePattern, patternValue } = checkSpecialPattern(values);

      // Determine final parameter type: Variable, Discrete, or Enter
      const counts = fieldTypeCounts[rawKey] || { Variable: 0, Discrete: 0, Enter: 0 };
      let pType = 'Enter';
      if (counts.Variable > 0) {
        pType = 'Variable';
      } else if (counts.Discrete > 0) {
        pType = 'Discrete';
      }

      return `
        <tr class="readout-row">
          <td class="col-slno" style="width:5%;">${sNumber++}</td>
          <td class="col-paramName" contenteditable="true" style="text-align: left; width:25%;">${cleanedKeys[index]}</td>
          <td class="col-paramType" contenteditable="true" style="width:14%;">${pType}</td>
          <td class="col-s" contenteditable="true" style="width:6%;">${isAllSame || usePattern ? '' : '✔'}</td>
          <td class="col-ns" contenteditable="true" style="width:6%;">${isAllSame || usePattern ? '✔' : ''}</td>
          <td class="col-nr" contenteditable="true" style="width:6%;"></td>
          <td class="col-us" contenteditable="true" style="width:6%;"></td>
          <td class="col-comments" contenteditable="true" style="width:21%;">${isAllSame || usePattern ? `Always "${isAllSame ? sameValue : patternValue}"` : ''}</td>
        </tr>`;
    }).join('');

    dynamicReadoutTables += `<tr><td colspan="8" class="readout-header" style="width:100%;">${baseName}</td></tr>${tableRows}`;
  }

  html = html.replace('{{dynamicReadoutTables}}', dynamicReadoutTables);
  res.send(html);
});

module.exports = router;