function removeSubframeIndexFromReport1(rows, fileName = "Unknown File") {
  const removedKeys = new Set();

  const cleanedRows = rows.map((row) => {
    const newRow = { ...row };

    for (const key of Object.keys(newRow)) {
      if (key.trim().toLowerCase() === 'subframe index') {
        removedKeys.add(key);   // ✅ track
        delete newRow[key];
      }
    }

    return newRow;
  });

  // ✅ Log once per file
  if (removedKeys.size > 0) {
    console.log(`\n ${fileName}: removed keys ->`, Array.from(removedKeys));
  }

  return cleanedRows;
}

module.exports = removeSubframeIndexFromReport1;