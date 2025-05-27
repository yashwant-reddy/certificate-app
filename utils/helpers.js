// utils/helpers.js

// Clean and format field keys
function cleanAndFilterAndFormatKeys(keys) {
  const regex =
    /(_%|_mV|_Kts|_Ft|_\.\.|_\.{3}Year|_\.{3}|_.._Year|_DegC|_Deg\ C|_DecC|_lb|_Psi|_Deg|_g|_MHz|_NM|_mb)$/;
  return keys.map((str) => str.replace(regex, "").replace(/_/g, " "));
}

// Classify field types in CSV rows
function classifyFieldTypes(data) {
  const result = {};
  const dataArray = Array.isArray(data) ? data : [data];
  const allKeys = [...new Set(dataArray.flatMap((obj) => Object.keys(obj)))];

  const timeRegex = /^\d{2}:\d{2}:\d{2}$/;
  const onlyDashesRegex = /^-+$/;
  const onlyDotsRegex = /^\.+$/;
  const discreteRegex = /^[A-Za-z0-9 _/\-().:]+$/;

  for (const key of allKeys) {
    let isAllUpdate = true;
    let isAnyVariable = false;
    let isAllDiscrete = true;

    for (const row of dataArray) {
      const value = row[key];
      if (value === undefined || value === null) continue;

      const cleanedValue = value.toString().trim();
      if (cleanedValue === "") continue;

      const isOnlyDashes = onlyDashesRegex.test(cleanedValue);
      const isOnlyDots = onlyDotsRegex.test(cleanedValue);
      const isTime = timeRegex.test(cleanedValue);
      const isNumber = !isNaN(cleanedValue);
      const isDiscreteCandidate = discreteRegex.test(cleanedValue);

      if (isOnlyDashes || isOnlyDots) {
        continue; // still update
      } else if (isNumber || isTime) {
        isAnyVariable = true;
        isAllUpdate = false;
        isAllDiscrete = false;
      } else if (isDiscreteCandidate) {
        isAllUpdate = false;
        // still discrete
      } else {
        isAllUpdate = false;
        isAllDiscrete = false;
      }
    }

    if (isAllUpdate) {
      result[key] = "Update";
    } else if (isAnyVariable) {
      result[key] = "Variable";
    } else if (isAllDiscrete) {
      result[key] = "Discrete";
    } else {
      result[key] = "Update";
    }
  }

  return result;
}

// Safely handle undefined or blank values
function safeValue(val) {
  return val === undefined || val === null ? "Update" : val;
}

module.exports = {
  cleanAndFilterAndFormatKeys,
  classifyFieldTypes,
  safeValue,
};
