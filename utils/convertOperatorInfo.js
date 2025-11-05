#!/usr/bin/env node
/**
 * convertOperatorInfo.js
 *
 * Reads an Excel file (Operator Info.xlsx) and writes a JSON file keyed by "Aircraft Region",
 * with nested FDR/QAR structures inside each region.
 *
 * - Blank cells => null
 * - Preserves leading zeros when Excel cell is text or formatted (raw:false)
 * - Attempts to write to the provided --out path first.
 *   If that write fails, falls back to <projectRoot>/data/Operator Info.json
 *
 * Usage examples:
 *   node utils/convertOperatorInfo.js --in "data/Operator Info.xlsx" --out "data/Operator Info.json"
 *   node utils/convertOperatorInfo.js --in "data/Operator Info.xlsx" --out "\\\\10.15.8.151\\Nest Application\\certificate-app\\data\\Operator Info.json"
 *   node utils/convertOperatorInfo.js --in "data/Operator Info.xlsx" --out "data/" --sheet "Sheet1"
 *
 * Requires:
 *   npm i xlsx
 */

const fs = require("fs");
const path = require("path");
const XLSX = require("xlsx");

// ------------------------------
// CLI ARGS
// ------------------------------
function getArg(flag, def = undefined) {
  const idx = process.argv.indexOf(flag);
  if (idx !== -1 && idx + 1 < process.argv.length) return process.argv[idx + 1];
  return def;
}

const inPath = getArg("--in");
const outPath = getArg("--out");
const sheetNameArg = getArg("--sheet", null);

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
  "SL No",
  "Aircraft Region",
  "Aircraft type",
  "Operator",
  "Source Type", // ✅ Added new column
  "Part Number",
  "Serial Number",
  "LFL Reference No",
  "Software Type",
  "No of Parameter recorded",
  "No of Parameter submitted for Evaluation",
];

const headerAliases = {
  "sl no": "SL No",
  "slno": "SL No",
  "s.no": "SL No",

  "aircraft region": "Aircraft Region",
  "ac reg": "Aircraft Region",
  "a/c reg": "Aircraft Region",
  "acregion": "Aircraft Region",

  "aircraft type": "Aircraft type",
  "a/c type": "Aircraft type",
  "aircrafttype": "Aircraft type",

  "operator": "Operator",

  // ✅ New: Source Type mapping
  "source type": "Source Type",
  "sourcetype": "Source Type",
  "source": "Source Type",
  "data source": "Source Type",

  "part number": "Part Number",
  "p/n": "Part Number",

  "serial number": "Serial Number",
  "s/n": "Serial Number",

  // ✅ Unified to correct spelling
  "lfl refrence no": "LFL Reference No",
  "lfl reference no": "LFL Reference No",
  "lfl ref no": "LFL Reference No",
  "lfl reference number": "LFL Reference No",

  "software type": "Software Type",
  "softwaretype": "Software Type",

  "no of parameter recorded": "No of Parameter recorded",
  "no of parameters recorded": "No of Parameter recorded",

  "no of parameter submitted for evaluation": "No of Parameter submitted for Evaluation",
  "no of parameters submitted for evaluation": "No of Parameter submitted for Evaluation",
};

function toCanonicalHeader(h) {
  if (!h && h !== 0) return null;
  const cleaned = String(h).trim().replace(/\s+/g, " ").toLowerCase();
  return (
    headerAliases[cleaned] ||
    canonicalHeaders.find((ch) => ch.toLowerCase() === cleaned) ||
    null
  );
}

// ------------------------------
// VALUE NORMALIZATION
// ------------------------------
function trimValue(v) {
  if (typeof v === "string") {
    const trimmed = v.trim();
    return trimmed === "" ? null : trimmed;
  }
  return v;
}

function normalizeValue(v) {
  if (v === undefined || v === "") return null;
  if (typeof v === "number" && Number.isNaN(v)) return null;
  return trimValue(v);
}

// ------------------------------
// SHEET READER
// ------------------------------
function readSheetToJson(workbook, sheetName) {
  const ws = workbook.Sheets[sheetName];
  if (!ws) throw new Error(`Sheet "${sheetName}" not found`);
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
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  return dir;
}

function writeAtomic(filePath, dataStr) {
  const dir = path.dirname(filePath);
  const tmp = path.join(dir, `.${path.basename(filePath)}.${process.pid}.${Date.now()}.tmp`);
  fs.writeFileSync(tmp, dataStr, "utf8");
  fs.renameSync(tmp, filePath);
}

function safeWriteJSON(primaryPath, fallbackDir, jsonData) {
  const jsonStr = JSON.stringify(jsonData, null, 2);

  try {
    ensureDirForFile(primaryPath);
    writeAtomic(primaryPath, jsonStr);
    const stat = fs.statSync(primaryPath);
    console.log(`[OK] Wrote JSON (${stat.size} bytes) to: ${primaryPath}`);
    return primaryPath;
  } catch (err) {
    console.warn(`[WARN] Failed to write to primary path:\n  ${primaryPath}\n  Reason: ${err.message}`);
  }

  try {
    if (!fs.existsSync(fallbackDir)) fs.mkdirSync(fallbackDir, { recursive: true });
    const fallbackPath = path.join(fallbackDir, "Operator Info.json");
    writeAtomic(fallbackPath, jsonStr);
    const stat = fs.statSync(fallbackPath);
    console.log(`[OK] Wrote JSON (${stat.size} bytes) to fallback: ${fallbackPath}`);
    return fallbackPath;
  } catch (err) {
    console.error(`[ERROR] Fallback write also failed:\n  ${err.message}`);
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

  const wb = XLSX.readFile(inPath, { cellDates: true });
  const sheetName = sheetNameArg || wb.SheetNames[0];
  const rowsRaw = readSheetToJson(wb, sheetName);

  if (!rowsRaw || rowsRaw.length === 0) {
    console.error("ERROR: No data rows found in the sheet.");
    process.exit(1);
  }

  const output = {};

  for (const row of rowsRaw) {
    const normalized = {};
    for (const [key, val] of Object.entries(row)) {
      const canon = toCanonicalHeader(key);
      if (!canon) continue;
      normalized[canon] = normalizeValue(val);
    }

    // Ensure all canonical headers exist
    for (const h of canonicalHeaders) {
      if (!(h in normalized)) normalized[h] = null;
    }

    // Key by Aircraft Region
    let acReg = normalized["Aircraft Region"];
    if (!acReg) continue;
    acReg = String(acReg).trim();

    // Source Type
    const sourceType = (normalized["Source Type"] || "").trim().toUpperCase();
    if (!sourceType) continue;

    // Convert numeric-like fields
    const numericFields = new Set([
      "SL No",
      "No of Parameter recorded",
      "No of Parameter submitted for Evaluation",
    ]);
    for (const field of numericFields) {
      const v = normalized[field];
      if (v === null) continue;
      if (typeof v === "string" && v.trim() !== "" && !Number.isNaN(Number(v))) {
        normalized[field] = Number(v);
      }
    }

    // Ensure main key exists
    if (!output[acReg]) output[acReg] = {};

    // Build nested structure per Source Type (FDR / QAR)
    output[acReg][sourceType] = {
      "Aircraft Type": acReg,
      "Source Type": sourceType,
      "Aircraft type": normalized["Aircraft type"],
      "Operator": normalized["Operator"],
      "Part Number": normalized["Part Number"],
      "Serial Number": normalized["Serial Number"],
      "LFL Reference No": normalized["LFL Reference No"],
      "Software Type": normalized["Software Type"],
      "No of Parameter recorded": normalized["No of Parameter recorded"],
      "No of Parameter submitted for Evaluation": normalized["No of Parameter submitted for Evaluation"],
    };
  }

  const projectRoot = path.join(__dirname, "..");
  const fallbackDataDir = path.join(projectRoot, "data");
  const finalPath = safeWriteJSON(outPath, fallbackDataDir, output);

  console.log("[DONE] Output JSON path:", finalPath);
} catch (err) {
  console.error("ERROR:", err.message || err);
  process.exit(1);
}
