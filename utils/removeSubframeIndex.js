function removeSubframeIndexFromReport1(rows) {
  return rows.map((row) => {
    const newRow = { ...row };
    // Try all casing and trimming variations for safety
    for (const key of Object.keys(newRow)) {
      if (key.trim().toLowerCase() === 'subframe index') {
        delete newRow[key];
      }
    }
    return newRow;
  });
}

module.exports = removeSubframeIndexFromReport1;
