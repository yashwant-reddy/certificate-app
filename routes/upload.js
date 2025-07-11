console.log('[INFO] Reached file: uploads.js');


const express = require('express');
const multer = require('multer');
const csv = require('csv-parser');
const fs = require('fs');
const path = require('path');

const router = express.Router();
const upload = multer({ dest: 'uploads/' });

const removeSubframeIndexFromReport1 = require('../utils/removeSubframeIndex');

const baseDir = process.cwd();
const uploadsDir = path.join(baseDir, 'uploads');

try {
  fs.mkdirSync(uploadsDir, { recursive: true });
  console.log(`[INFO] Ensured uploads directory: ${uploadsDir}`);
} catch (err) {
  console.error('[ERROR] Creating uploads directory:', uploadsDir, err);
}

// Utility: Check if a filename (without extension) contains ONLY a standalone 1 (not 11, 12, etc)
function isStandalone1File(filename) {
  const baseName = path.parse(filename).name;
  return /(^|[^\d])1(\D|$)/.test(baseName);
}

router.post('/', upload.array('files'), async (req, res) => {
  const files = req.files || [];
  console.log(
    `[INFO] Received files:`,
    files.map((f) => f.originalname)
  );

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
        const originalName = file.originalname;

        const filePath = file.path;
        console.log(`[INFO] Reading uploaded CSV: ${filePath}`);
        fs.createReadStream(filePath)
          .pipe(csv())
          .on('data', (data) => results.push(data))
          .on('end', () => {
            allResults[originalName] = results;
            if (results.length > 0) {
              firstObjects[originalName] = results[0];
            }
            try {
              fs.unlinkSync(filePath); // Clean up temp upload
              console.log(`[INFO] Deleted temp uploaded file: ${filePath}`);
            } catch (err) {
              console.error('[ERROR] Deleting temp file:', filePath, err);
            }
            resolve();
          })
          .on('error', (err) => {
            console.error(`[ERROR] Reading ${originalName}:`, err);
            reject(err);
          });
      });
    })
  );

  // Step 2: Clean up any file with a standalone '1' (not 11, 12, etc)
  for (const fileName of Object.keys(allResults)) {
    if (isStandalone1File(fileName)) {
      console.log(`[INFO] Cleaning Subframe Index from: ${fileName}`);
      allResults[fileName] = removeSubframeIndexFromReport1(
        allResults[fileName]
      );
      if (allResults[fileName].length > 0) {
        firstObjects[fileName] = allResults[fileName][0];
      }
      console.log(`✅ Keys in cleaned "${fileName}":`);
      console.log(Object.keys(allResults[fileName][0]));
    }
  }

  // Normalize keys
  const normalizeKey = (key) => key.trim().toLowerCase();
  const normalizedSubframeIndexKey = normalizeKey('Subframe Index');

  // Step 3: Count key frequency across all first rows
  const keyFrequency = {};
  Object.values(firstObjects).forEach((obj) => {
    Object.keys(obj).forEach((key) => {
      const nKey = normalizeKey(key);
      keyFrequency[nKey] = (keyFrequency[nKey] || 0) + 1;
    });
  });

  // Step 4: Determine repeating keys
  const repeatingKeys = new Set(
    Object.entries(keyFrequency)
      .filter(([_, count]) => count > 1)
      .map(([key]) => key)
  );
  // REMOVE this line!
  // repeatingKeys.add(normalizedSubframeIndexKey); // Always remove Subframe Index

  console.log('\n🚫 Keys to remove (normalized):');
  console.log(Array.from(repeatingKeys));

  // Step 5: Filter rows
  const filteredResults = {};
  for (const [fileName, rows] of Object.entries(allResults)) {
    if (isStandalone1File(fileName)) {
      // For '1' files, do not filter any more keys—just output as already cleaned!
      filteredResults[fileName] = rows;
      console.log(
        `📄 ${fileName}: no keys removed except 'Subframe Index' (by special rule)`
      );
    } else {
      // For other files, remove repeating keys as usual
      filteredResults[fileName] = rows.map((row) => {
        const filtered = {};
        for (const key in row) {
          const trimmedKey = key.trim();
          const nKey = normalizeKey(trimmedKey);

          const shouldRemove = repeatingKeys.has(nKey);
          if (!shouldRemove) {
            filtered[trimmedKey] = row[key];
          }
        }
        return filtered;
      });

      const originalKeys = new Set(rows.flatMap((r) => Object.keys(r)));
      const removedKeys = [...originalKeys].filter((key) => {
        const nKey = normalizeKey(key);
        return repeatingKeys.has(nKey);
      });

      console.log(`📄 ${fileName}: removed keys ->`, removedKeys);
    }
  }

  // Step 6: Write JSON files with actual filenames
  for (const [fileName, rows] of Object.entries(filteredResults)) {
    const baseName = path.parse(fileName).name;
    const outputData = [
      {
        file: fileName,
        [`${baseName} Content`]: rows,
      },
    ];

    const outputFileName = `${baseName}.json`;
    const outputPath = path.join(uploadsDir, outputFileName);

    try {
      fs.writeFileSync(outputPath, JSON.stringify(outputData, null, 2));
      console.log(`[INFO] Wrote JSON output: ${outputPath}`);
    } catch (err) {
      console.error(
        `[ERROR] Writing output for ${fileName} (${outputPath}):`,
        err
      );
    }
  }

  // Step 7: Save manifest with base file names (no extension) sorted logically
  const uploadedBaseNames = Object.keys(filteredResults).map(
    (name) => path.parse(name).name
  );

  function logicalSort(a, b) {
    const extractParts = (filename) => {
      const match = filename.match(/(\d+)([a-zA-Z]*)/);
      return match ? [parseInt(match[1]), match[2] || ''] : [0, ''];
    };

    const [numA, suffixA] = extractParts(a);
    const [numB, suffixB] = extractParts(b);

    if (numA !== numB) return numA - numB;
    return suffixA.localeCompare(suffixB);
  }

  const sortedBaseNames = uploadedBaseNames.sort(logicalSort);

  const manifestPath = path.join(uploadsDir, 'manifest.json');
  try {
    fs.writeFileSync(manifestPath, JSON.stringify(sortedBaseNames, null, 2));
    console.log(`[INFO] Wrote manifest: ${manifestPath}`);
  } catch (err) {
    console.error(`[ERROR] Writing manifest file: ${manifestPath}`, err);
  }

  res.send(
    `<h2>All ${files.length} CSV files processed with key filtering complete.</h2>`
  );
});

module.exports = router;
