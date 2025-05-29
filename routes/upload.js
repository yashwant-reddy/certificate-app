const express = require('express');
const multer = require('multer');
const csv = require('csv-parser');
const fs = require('fs');
const path = require('path');

const router = express.Router();
const upload = multer({ dest: 'uploads/' });

const removeSubframeIndexFromReport1 = require('../utils/removeSubframeIndex');

router.post('/', upload.array('files'), async (req, res) => {
  const files = req.files || [];
  if (files.length === 0) {
    return res.send('No files uploaded.');
  }

  const allResults = {};
  const firstObjects = {};

  // Step 1: Parse all CSV files
  await Promise.all(
    files.map((file) => {
      return new Promise((resolve, reject) => {
        const results = [];
        const match = file.originalname.match(/\d+/);
        const reportNumber = match ? parseInt(match[0], 10) : 'Unknown';

        fs.createReadStream(file.path)
          .pipe(csv())
          .on('data', (data) => results.push(data))
          .on('end', () => {
            allResults[reportNumber] = results;
            if (results.length > 0) {
              firstObjects[reportNumber] = results[0];
            }
            fs.unlinkSync(file.path); // Clean up temp upload
            resolve();
          })
          .on('error', (err) => {
            console.error(`Error reading ${file.originalname}:`, err);
            reject(err);
          });
      });
    })
  );

  // Clean up Report 1
  if (allResults[1]) {
    allResults[1] = removeSubframeIndexFromReport1(allResults[1]);
    firstObjects[1] = allResults[1][0]; // update first object after cleanup
  }

  console.log('\n✅ Keys in cleaned Report 1:');
  console.log(Object.keys(allResults[1][0]));

  // Normalize keys for comparison (lowercase, trimmed)
  const normalizeKey = (key) => key.trim().toLowerCase();

  const normalizedSubframeIndexKey = normalizeKey('Subframe Index');

  // Step 3: Count key frequency across all first rows (normalized)
  const keyFrequency = {};
  Object.values(firstObjects).forEach((obj) => {
    Object.keys(obj).forEach((key) => {
      const nKey = normalizeKey(key);
      keyFrequency[nKey] = (keyFrequency[nKey] || 0) + 1;
    });
  });

  // Step 4: Build full removal key set (normalized keys)
  /* eslint-disable no-unused-vars */
  const repeatingKeys = new Set(
    Object.entries(keyFrequency)
      .filter(([_, count]) => count > 1)
      .map(([key]) => key)
  );
  repeatingKeys.add(normalizedSubframeIndexKey); // Always remove Subframe Index

  console.log('\n🚫 Keys to remove (normalized):');
  console.log(Array.from(repeatingKeys));

  // Step 5: Filter rows
  const filteredResults = {};
  for (const [reportNumber, rows] of Object.entries(allResults)) {
    const num = parseInt(reportNumber, 10);

    filteredResults[reportNumber] = rows.map((row) => {
      const filtered = {};
      for (const key in row) {
        const trimmedKey = key.trim();
        const nKey = normalizeKey(trimmedKey);

        const shouldRemove =
          (num === 1 &&
            (nKey === normalizedSubframeIndexKey ||
              trimmedKey === 'Subframe Index')) ||
          (num !== 1 &&
            (repeatingKeys.has(nKey) || trimmedKey === 'Subframe Index'));

        if (!shouldRemove) {
          filtered[trimmedKey] = row[key];
        }
      }

      return filtered;
    });

    const originalKeys = new Set(rows.flatMap((r) => Object.keys(r)));
    const removedKeys = [...originalKeys].filter((key) => {
      const nKey = normalizeKey(key);
      return num === 1
        ? nKey === normalizedSubframeIndexKey
        : repeatingKeys.has(nKey);
    });
    console.log(`\n📄 Report ${reportNumber}: removed keys ->`, removedKeys);
  }

  // Step 6: Write JSON output
  for (const [reportNumber, rows] of Object.entries(filteredResults)) {
    const outputData = [
      {
        file: `Readout Report ${reportNumber}.csv`,
        [`Readout Report ${reportNumber} Content`]: rows,
      },
    ];

    const outputFileName = `Readout Report ${reportNumber}.json`;
    const outputPath = path.join(__dirname, '..', 'uploads', outputFileName);

    try {
      fs.writeFileSync(outputPath, JSON.stringify(outputData, null, 2));
    } catch (err) {
      console.error(`Error writing output for Report ${reportNumber}:`, err);
    }
  }

  // Step 7: Save manifest
  const uploadedReports = Object.keys(filteredResults)
    .map((n) => parseInt(n, 10))
    .filter((n) => !isNaN(n))
    .sort((a, b) => a - b);

  fs.writeFileSync(
    path.join(__dirname, '..', 'uploads', 'manifest.json'),
    JSON.stringify(uploadedReports, null, 2)
  );

  res.send(
    `<h2>All ${files.length} CSV files processed with key filtering complete.</h2>`
  );
});

module.exports = router;
