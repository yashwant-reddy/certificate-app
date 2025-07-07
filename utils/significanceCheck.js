const {
  cleanAndFilterAndFormatKeys,
  classifyFieldTypes,
  safeValue,
  isInteger,
  isFloat,
  isString,
} = require('../utils/helpers');

function isAllSameValue(values) {
  const stringified = values.map((v) =>
    typeof v === 'string' ? v.trim() : String(v)
  );
  const unique = [...new Set(stringified.map((v) => JSON.stringify(v)))];
  const isAllSame = unique.length === 1;
  let dataType = null;
  let parsedValue = null;

  if (isAllSame) {
    const val = stringified[0];
    if (isInteger(val)) {
      dataType = 'integer';
      // Remove .0 if present, so "0.00" -> 0
      parsedValue = parseInt(Number(val), 10);
    } else if (isFloat(val)) {
      dataType = 'float';
      parsedValue = parseFloat(val);
    } else {
      dataType = 'string';
      parsedValue = val;
    }
  }

  return {
    isAllSame,
    sameValue: isAllSame ? stringified[0] : null,
    dataType,
    parsedValue,
  };
}

function checkSpecialPattern(values) {
  const stringified = values.map((v) =>
    typeof v === 'string' ? v.trim() : String(v)
  );

  const possiblePatternLengths = [2, 3, 4, 5];

  for (const patternLen of possiblePatternLengths) {
    for (let offset = 0; offset < patternLen; offset++) {
      if (offset >= stringified.length) continue;

      const candidatePattern = [];
      for (
        let i = offset;
        i < offset + patternLen && i < stringified.length;
        i++
      ) {
        candidatePattern.push(stringified[i]);
      }
      if (candidatePattern.length < patternLen) continue;

      // Find indices of '---' or more dashes and non-dash values in the candidate pattern
      const dashPositions = [];
      const valuePositions = [];
      for (let j = 0; j < candidatePattern.length; j++) {
        if (/^-{3,}$/.test(candidatePattern[j])) dashPositions.push(j);
        else valuePositions.push(j);
      }

      // Must have exactly one meaningful (non dash) position
      if (valuePositions.length !== 1) continue;

      const variableIndex = valuePositions[0];
      const variableValue = candidatePattern[variableIndex];

      let valid = true;

      // Check the entire array in segments of patternLen, starting at offset
      for (let i = offset; i < stringified.length; i += patternLen) {
        const segment = stringified.slice(i, i + patternLen);
        if (segment.length < patternLen) break; // ignore trailing partial segment

        // Check dashes
        for (const dashPos of dashPositions) {
          if (!/^-{3,}$/.test(segment[dashPos])) {
            valid = false;
            break;
          }
        }
        if (!valid) break;

        // Check meaningful value
        if (segment[variableIndex] !== variableValue) {
          valid = false;
          break;
        }
      }

      if (valid) {
        return {
          usePattern: true,
          patternValue: variableValue,
          patternLength: patternLen,
          patternOffset: offset,
        };
      }
    }
  }

  return {
    usePattern: false,
    patternValue: null,
  };
}

module.exports = {
  isAllSameValue,
  checkSpecialPattern,
};
