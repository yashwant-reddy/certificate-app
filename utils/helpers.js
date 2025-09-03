// utils/helpers.js

// Clean and format field keys
function cleanAndFilterAndFormatKeys(keys) {
  const regex =
    /(_%|_mV|_Kts|_Ft|_\.\.|_\.{3}Year|_\.{3}|_.._Year|_DegC|_Deg C|_DecC|_lb|_Psi|_Deg|_g|_MHz|_NM|_mb)$/;

  return keys.map((str) => str.replace(regex, '').replace(/_/g, ' '));
}

// Classify field types in CSV rows
function classifyFieldTypes(data) {
  const result = {};
  const dataArray = Array.isArray(data) ? data : [data];
  const allKeys = [...new Set(dataArray.flatMap((obj) => Object.keys(obj)))];

  const timeRegex = /^\d{2}:\d{2}:\d{2}$/;
  const onlyDashesRegex = /^-{3,}$/; // only 3 or more dashes
  const onlyDotsRegex = /^\.+$/;
  const discreteRegex = /^[A-Za-z0-9 _/\-().:]+$/;

  for (const key of allKeys) {
    let isAllEnter = true;
    let isAnyVariable = false;
    let isAllDiscrete = true;

    // --- PATCH: Special all-dashes check ---
    let allDashes = true;
    let hasValue = false;
    for (const row of dataArray) {
      const value = row[key];
      if (
        value === undefined ||
        value === null ||
        value.toString().trim() === ''
      )
        continue;
      hasValue = true;
      if (!onlyDashesRegex.test(value.toString().trim())) {
        allDashes = false;
        break;
      }
    }
    if (hasValue && allDashes) {
      result[key] = 'Discrete';
      continue; // go to next key
    }
    // --- END PATCH ---

    for (const row of dataArray) {
      const value = row[key];
      if (value === undefined || value === null) continue;

      const cleanedValue = value.toString().trim();
      if (cleanedValue === '') continue;

      const isOnlyDashes = onlyDashesRegex.test(cleanedValue);
      const isOnlyDots = onlyDotsRegex.test(cleanedValue);
      const isTime = timeRegex.test(cleanedValue);
      const isNumber = !isNaN(cleanedValue) && cleanedValue !== '';
      const isDiscreteCandidate = discreteRegex.test(cleanedValue);

      if (isOnlyDashes) {
        continue;
      } else if (isOnlyDots) {
        continue;
      } else if (isNumber || isTime) {
        isAnyVariable = true;
        isAllEnter = false;
        isAllDiscrete = false;
      } else if (isDiscreteCandidate) {
        isAllEnter = false;
        // still discrete
      } else {
        isAllEnter = false;
        isAllDiscrete = false;
      }
    }

    if (isAllEnter) {
      result[key] = 'Enter';
    } else if (isAnyVariable) {
      result[key] = 'Variable';
    } else if (isAllDiscrete) {
      result[key] = 'Discrete';
    } else {
      result[key] = 'Enter';
    }
  }

  return result;
}

// Safely handle undefined or blank values
function safeValue(val) {
  return val === undefined || val === null ? 'Enter' : val;
}

function isInteger(val) {
  // Accepts strings like '0', '1', '-2', or floats like '2.0' if the decimal part is zero
  if (typeof val !== 'string' && typeof val !== 'number') return false;
  const s = String(val).trim();
  // If it's a plain integer
  if (/^-?\d+$/.test(s)) return true;
  // If it's a float that represents an integer (e.g., '2.0')
  if (/^-?\d+\.0+$/.test(s)) return true;
  return false;
}

function isFloat(val) {
  // Accepts strings like '2.5', '-0.01' (NOT integer-like floats)
  if (typeof val !== 'string' && typeof val !== 'number') return false;
  const s = String(val).trim();
  // Float must have decimals and cannot be all zeros after dot
  if (/^-?\d*\.\d+$/.test(s) && !/^-?\d+\.0+$/.test(s)) return true;
  return false;
}

function isString(val) {
  if (val === null || val === undefined) return false;
  const s = String(val).trim();
  return !isInteger(s) && !isFloat(s);
}

module.exports = {
  cleanAndFilterAndFormatKeys,
  classifyFieldTypes,
  safeValue,
  isInteger,
  isFloat,
  isString,
};
