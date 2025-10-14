#!/usr/bin/env node
/**
 * convertOperatorInfo.js
 *
 * Reads an Excel file (Operator Info.xlsx) and writes a JSON file keyed by "Aircraft Region".
 * - Blank cells => null
 * - Preserves leading zeros when Excel cell is text or formatted (raw:false)
 * - Attempts to write to the provided --out path first.
 *   If that write fails (permissions / path), falls back to <projectRoot>/data/Operator Info.json
 *
 * Usage examples:
 *   node utils/convertOperatorInfo.js --in "data/Operator Info 2.xlsx" --out "\\\\10.15.8.151\\Nest Application\\certificate-app\\data\\Operator Info.json"
 *   node utils/convertOperatorInfo.js --in "data/Operator Info.xlsx" --out "data/Operator Info.json" --sheet "Sheet1"
 *   node utils/convertOperatorInfo.js --in "data/Operator Info 2 2 2.xlsx" --out "data/"
 *
 * Requires:
 *   npm i xlsx
 */

const fs = require('fs');
const path = require('path');
const XLSX = require('xlsx');

// ------------------------------
// CLI ARGS
// ------------------------------
function getArg(flag, def = undefined) {
  const idx = process.argv.indexOf(flag);
  if (idx !== -1 && idx + 1 < process.argv.length) return process.argv[idx + 1];
  return def;
}

const inPath = getArg('--in');
const outPath = getArg('--out'); // primary output (can be UNC)
const sheetNameArg = getArg('--sheet', null);

if (!inPath) {
  console.error('ERROR: Please provide --in "<excel path>".');
  process.exit(1);
}
if (!outPath) {
  console.error('ERROR: Please provide --out "<json path>" (UNC or local).');
  process.exit(1);
}

// ------------------------------
// HEADER NORMALIZATION
// ------------------------------
const canonicalHeaders = [
  'SL No',
  'Aircraft Region',
  'Aircraft type',
  'Operator',
  'Part Number',
  'Serial Number',
  'LFL Refrence NO',
  'Software Type',
  'No of Parameter recorded',
  'No of Parameter submitted for Evaluation',
];

// Common header variations mapped to canonical header keys
const headerAliases = {
  'sl no': 'SL No',
  'slno': 'SL No',
  's.no': 'SL No',

  'aircraft region': 'Aircraft Region',
  'ac reg': 'Aircraft Region',
  'a/c reg': 'Aircraft Region',

  'aircraft type': 'Aircraft type',

  'operator': 'Operator',

  'part number': 'Part Number',

  'serial number': 'Serial Number',

  'lfl refrence no': 'LFL Refrence NO',
  'lfl reference no': 'LFL Refrence NO', // tolerate spelling

  'software type': 'Software Type',

  'no of parameter recorded': 'No of Parameter recorded',
  'no of parameters recorded': 'No of Parameter recorded',

  'no of parameter submitted for evaluation': 'No of Parameter submitted for Evaluation',
  'no of parameters submitted for evaluation': 'No of Parameter submitted for Evaluation',
};

function toCanonicalHeader(h) {
  if (!h && h !== 0) return null;
  const cleaned = String(h).trim().replace(/\s+/g, ' ').toLowerCase();
  return headerAliases[cleaned] || canonicalHeaders.find(ch => ch.toLowerCase() === cleaned) || null;
}

// ------------------------------
// VALUE NORMALIZATION
// ------------------------------
function normalizeValue(v) {
  // undefined or empty string => null; numeric NaN => null
  if (v === undefined || v === '') return null;
  if (typeof v === 'number' && Number.isNaN(v)) return null;
  return v;
}

// Read sheet -> JSON rows
function readSheetToJson(workbook, sheetName) {
  const ws = workbook.Sheets[sheetName];
  if (!ws) throw new Error(`Sheet "${sheetName}" not found`);

  // defval: null => missing cells become null
  // raw: false => use formatted text (helps preserve leading zeros if formatted or text)
  return XLSX.utils.sheet_to_json(ws, {
    defval: null,
    raw: false,
    blankrows: false,
  });
}

// ------------------------------
// SAFE WRITE WITH FALLBACK
// ------------------------------
function ensureDirForFile(filePath) {
  const dir = path.dirname(filePath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  return dir;
}

function writeAtomic(filePath, dataStr) {
  const dir = path.dirname(filePath);
  const tmp = path.join(dir, `.${path.basename(filePath)}.${process.pid}.${Date.now()}.tmp`);
  fs.writeFileSync(tmp, dataStr, 'utf8');
  fs.renameSync(tmp, filePath); // atomic on same volume
}

function safeWriteJSON(primaryPath, fallbackDir, jsonData) {
  const jsonStr = JSON.stringify(jsonData, null, 2);

  // 1) Try primary (e.g., UNC) path
  try {
    ensureDirForFile(primaryPath);
    writeAtomic(primaryPath, jsonStr);

    // Verify
    fs.accessSync(primaryPath, fs.constants.R_OK);
    const stat = fs.statSync(primaryPath);
    console.log(`[OK] Wrote JSON (${stat.size} bytes) to: ${primaryPath}`);
    return primaryPath;
  } catch (err) {
    console.warn(`[WARN] Failed to write to primary path:\n  ${primaryPath}\n  Reason: ${err.message}`);
  }

  // 2) Fallback to local project data/
  try {
    if (!fs.existsSync(fallbackDir)) fs.mkdirSync(fallbackDir, { recursive: true });
    const fallbackPath = path.join(fallbackDir, 'Operator Info.json');
    writeAtomic(fallbackPath, jsonStr);

    fs.accessSync(fallbackPath, fs.constants.R_OK);
    const stat = fs.statSync(fallbackPath);
    console.log(`[OK] Wrote JSON (${stat.size} bytes) to fallback: ${fallbackPath}`);
    return fallbackPath;
  } catch (err) {
    console.error(`[ERROR] Fallback write also failed:\n  ${err.message}`);
    console.error('Hint: Check share permissions, path spelling, and whether the directory exists.');
    process.exit(1);
  }
}

// ------------------------------
// MAIN
// ------------------------------
try {
  if (!fs.existsSync(inPath)) {
    console.error(`ERROR: Excel file not found: ${inPath}`);
    process.exit(1);
  }

  // Load workbook
  const wb = XLSX.readFile(inPath, { cellDates: true });
  const sheetName = sheetNameArg || wb.SheetNames[0];

  // Extract rows
  const rowsRaw = readSheetToJson(wb, sheetName);
  if (!rowsRaw || rowsRaw.length === 0) {
    console.error('ERROR: No data rows found in the sheet.');
    process.exit(1);
  }

  // Build final output keyed by "Aircraft Region"
  const output = {};

  for (const row of rowsRaw) {
    // Normalize headers to canonical keys
    const normalized = {};
    for (const [key, val] of Object.entries(row)) {
      const canon = toCanonicalHeader(key);
      if (!canon) continue; // ignore unknown columns
      normalized[canon] = normalizeValue(val);
    }

    // Ensure all canonical headers exist
    for (const h of canonicalHeaders) {
      if (!(h in normalized)) normalized[h] = null;
    }

    // Key must be Aircraft Region
    const acReg = normalized['Aircraft Region'];
    if (!acReg) continue; // skip if missing

    // Convert numeric-like fields to numbers (keep Serial Number as-is to preserve zeros)
    const numericFields = new Set([
      'SL No',
      'No of Parameter recorded',
      'No of Parameter submitted for Evaluation',
    ]);
    for (const field of numericFields) {
      const v = normalized[field];
      if (v === null) continue;
      if (typeof v === 'string' && v.trim() !== '' && !Number.isNaN(Number(v))) {
        normalized[field] = Number(v);
      }
    }

    // Compose final object for this Aircraft Region
    output[String(acReg)] = {
      'SL No': normalized['SL No'],
      'Aircraft Region': normalized['Aircraft Region'],
      'Aircraft type': normalized['Aircraft type'],
      'Operator': normalized['Operator'],
      'Part Number': normalized['Part Number'],
      'Serial Number': normalized['Serial Number'],
      'LFL Refrence NO': normalized['LFL Refrence NO'],
      'Software Type': normalized['Software Type'],
      'No of Parameter recorded': normalized['No of Parameter recorded'],
      'No of Parameter submitted for Evaluation': normalized['No of Parameter submitted for Evaluation'],
    };
  }

  // Determine fallback directory: <projectRoot>/data
  const projectRoot = path.join(__dirname, '..'); // up from utils/
  const fallbackDataDir = path.join(projectRoot, 'data');

  // Attempt primary write; fallback to local if needed
  const finalPath = safeWriteJSON(outPath, fallbackDataDir, output);

  console.log('[DONE] Output JSON path:', finalPath);
} catch (err) {
  console.error('ERROR:', err.message || err);
  process.exit(1);
}
