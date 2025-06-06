function isAllSameValue(values) {
  const stringified = values.map((v) =>
    typeof v === 'string' ? v.trim() : String(v)
  );
  const unique = [...new Set(stringified.map((v) => JSON.stringify(v)))];
  const isAllSame = unique.length === 1;
  //   console.log(
  //     `[isAllSameValue] isAllSame: ${isAllSame}, value: ${
  //       isAllSame ? stringified[0] : "N/A"
  //     }`
  //   );
  return {
    isAllSame,
    sameValue: isAllSame ? stringified[0] : null,
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

      // Find indices of '---' and non-'---' values in the candidate pattern
      const dashPositions = [];
      const valuePositions = [];
      for (let j = 0; j < candidatePattern.length; j++) {
        if (candidatePattern[j] === '---') dashPositions.push(j);
        else valuePositions.push(j);
      }

      // Must have exactly one meaningful (non '---') position
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
          if (segment[dashPos] !== '---') {
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
