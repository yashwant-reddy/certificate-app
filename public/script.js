let aircraftData = {};
let allAcRegOptions = [];
let allOperatorOptions = [];
let selectedOperator = '';

// Elements
const operatorInput = document.getElementById('operator');
const operatorDropdown = document.getElementById('operatorDropdown');
const acRegInput = document.getElementById('acReg');
const acRegDropdown = document.getElementById('acRegDropdown');
const fileContainer = document.querySelector('.file-container');
const previewButton = document.querySelector('#htmlForm button[type="submit"]');
const fileInput = document.getElementById('files');
const fileList = document.getElementById('file-list');
const sourceTypeInput = document.getElementById('sourceTypeInput');
const sourceTypeDropdown = document.getElementById('sourceTypeDropdown');
const uploadLabel = document.getElementById('uploadLabel');


fileContainer.style.display = 'none';
previewButton.style.display = 'none';

let operatorDropdownItems = [];
let operatorDropdownIndex = -1;
let acRegDropdownItems = [];
let acRegDropdownIndex = -1;
let sourceTypeDropdownItems = [];
let sourceTypeDropdownIndex = -1;

acRegInput.addEventListener('input', function () {
  updateQarFdrLabels(); // Always update label immediately
});


// Prevent form submission when pressing Enter in any input
document.getElementById('htmlForm').addEventListener('keydown', function (e) {
  // Only block if Enter is pressed and the target is not a button or textarea
  if (
    e.key === 'Enter' &&
    (e.target.tagName === 'INPUT' || e.target.tagName === 'SELECT')
  ) {
    e.preventDefault();
    return false;
  }
});

// --- Source Type Dropdown Logic ---
function showSourceTypeDropdown() {
  const reg = acRegInput.value.trim();
  if (!reg || !aircraftData[reg]) return;

  const availableSources = Object.keys(aircraftData[reg]);
  if (availableSources.length === 0) return;

  // only show when user focuses / clicks
  sourceTypeDropdown.style.display = 'block';
  positionSourceTypeDropdown();
  filterSourceTypeDropdown();
}


function hideSourceTypeDropdown() {
  setTimeout(() => {
    sourceTypeDropdown.style.display = 'none';
    sourceTypeDropdownIndex = -1;
  }, 400);
}

function positionSourceTypeDropdown() {
  sourceTypeDropdown.style.position = 'absolute';
  sourceTypeDropdown.style.top =
    sourceTypeInput.offsetTop + sourceTypeInput.offsetHeight + 'px';
  sourceTypeDropdown.style.left = sourceTypeInput.offsetLeft + 'px';
  sourceTypeDropdown.style.width = sourceTypeInput.offsetWidth + 'px';
  sourceTypeDropdown.style.maxHeight = '150px';
  sourceTypeDropdown.style.overflowY = 'auto';
  sourceTypeDropdown.style.border = '1px solid #ccc';
  sourceTypeDropdown.style.backgroundColor = '#fff';
  sourceTypeDropdown.style.zIndex = 1000;
}

function filterSourceTypeDropdown() {
  const filter = sourceTypeInput.value.toUpperCase();
  sourceTypeDropdown.innerHTML = '';

  const reg = acRegInput.value.trim();
  if (!reg || !aircraftData[reg]) return;

  let options = Object.keys(aircraftData[reg]);
  options = options.filter(opt => opt.toUpperCase().includes(filter));

  sourceTypeDropdownItems = [];
  sourceTypeDropdownIndex = -1;

  if (options.length === 0) {
    const div = document.createElement('div');
    div.textContent = 'No matches found';
    div.style.color = '#999';
    div.style.padding = '5px 10px';
    sourceTypeDropdown.appendChild(div);
  } else {
    options.forEach((type, idx) => {
      const div = createSourceTypeDropdownItem(type, idx);
      sourceTypeDropdown.appendChild(div);
      sourceTypeDropdownItems.push(div);
    });
  }
}


function createSourceTypeDropdownItem(type, idx) {
  const div = document.createElement('div');
  div.textContent = type;
  div.style.padding = '5px 10px';
  div.style.cursor = 'pointer';
  div.onmouseenter = () => highlightSourceTypeItem(idx);
  div.onmouseleave = () => unhighlightSourceTypeItem(idx);
  div.onclick = () => selectSourceType(type);
  return div;
}

function highlightSourceTypeItem(idx) {
  if (sourceTypeDropdownItems[sourceTypeDropdownIndex]) {
    sourceTypeDropdownItems[sourceTypeDropdownIndex].style.backgroundColor = '#fff';
  }
  sourceTypeDropdownIndex = idx;
  sourceTypeDropdownItems[idx].style.backgroundColor = '#d0e7fa';
}

function unhighlightSourceTypeItem(idx) {
  sourceTypeDropdownItems[idx].style.backgroundColor = '#fff';
  sourceTypeDropdownIndex = -1;
}

function selectSourceType(type) {
  sourceTypeInput.value = type;
  sourceTypeDropdown.style.display = 'none';

  // --- Update Upload & Label text dynamically ---
  const uploadLabel = document.getElementById('uploadLabel');
  const pnSnLabel = document.getElementById('pnSnLabel');

  const upperType = type.toUpperCase();
  if (upperType.includes('QAR')) {
    uploadLabel.textContent = 'Upload QAR Data:';
    pnSnLabel.textContent = 'QAR P/N–S/N:';
  } else {
    uploadLabel.textContent = 'Upload FDR Data:';
    pnSnLabel.textContent = 'FDR P/N–S/N:'; // ✅ default fallback = FDR
  }

  handleSourceTypeSelection(); // ✅ Fill dependent fields
}


// --- Handle Source Type Selection ---
function handleSourceTypeSelection() {
  const reg = acRegInput.value.trim();
  const type = sourceTypeInput.value.trim();

  // Safety check
  if (!reg || !type || !aircraftData[reg] || !aircraftData[reg][type]) {
    console.warn('handleSourceTypeSelection: Missing or invalid reg/type', { reg, type });
    return;
  }

  const data = aircraftData[reg][type];

  // Debug log (optional)
  console.log('[INFO] Populating fields for', reg, type, data);

  // Fill fields
  document.getElementById('typeOfAC').value = data['Aircraft type'] || data['Aircraft Type'] || '';
  document.getElementById('fdrPnSn').value =
    (data['Part Number'] || '') + ';' + (data['Serial Number'] || '');
  document.getElementById('lflRefNo').value = data['LFL Reference No'] || data['LFL Refrence NO'] || '';
  document.getElementById('noOfParametersRecorded').value =
    data['No of Parameter recorded'] || data['No of Parameters recorded'] || '';
  document.getElementById('noOfParametersSubmitted').value =
    data['No of Parameter submitted for Evaluation'] || data['No of Parameters submitted for Evaluation'] || '';

  // Update supporting fields
  document.getElementById('natureOfReadout').value = 'Periodical';
  document.getElementById('dataReceivedFrom').value = 'Operator';

  // Show upload controls
  fileContainer.style.display = 'block';
  previewButton.style.display = 'block';
}


sourceTypeInput.addEventListener('focus', showSourceTypeDropdown);
sourceTypeInput.addEventListener('blur', hideSourceTypeDropdown);
sourceTypeInput.addEventListener('input', filterSourceTypeDropdown);

sourceTypeInput.addEventListener('keydown', function (e) {
  if (
    sourceTypeDropdown.style.display !== 'block' ||
    sourceTypeDropdownItems.length === 0
  ) return;

  if (e.key === 'ArrowDown') {
    e.preventDefault();
    if (sourceTypeDropdownIndex < sourceTypeDropdownItems.length - 1) {
      highlightSourceTypeItem(sourceTypeDropdownIndex + 1);
      sourceTypeDropdownItems[sourceTypeDropdownIndex].scrollIntoView({
        block: 'nearest',
      });
    }
  } else if (e.key === 'ArrowUp') {
    e.preventDefault();
    if (sourceTypeDropdownIndex > 0) {
      highlightSourceTypeItem(sourceTypeDropdownIndex - 1);
      sourceTypeDropdownItems[sourceTypeDropdownIndex].scrollIntoView({
        block: 'nearest',
      });
    }
  } else if (e.key === 'Enter') {
    e.preventDefault();
    if (sourceTypeDropdownIndex > -1) {
      sourceTypeDropdownItems[sourceTypeDropdownIndex].click();
    } else if (sourceTypeDropdownItems.length === 1) {
      sourceTypeDropdownItems[0].click();
    }
  } else if (e.key === 'Escape') {
    sourceTypeDropdown.style.display = 'none';
  }
});


// Load aircraft data and prepare Operator/Reg options
window.addEventListener('DOMContentLoaded', async () => {
  try {
    const res = await fetch('/data/Operator Info.json');
    if (!res.ok) throw new Error('Failed to load aircraft data.');

    const jsonData = await res.json();
    aircraftData = {};
    const operatorSet = new Set();

    for (const acReg in jsonData) {
      const regData = jsonData[acReg];
      if (!regData) continue;

      aircraftData[acReg] = {}; // ensure nested structure

      for (const sourceType in regData) {
        const entry = regData[sourceType];
        if (!entry) continue;

        const cleanedEntry = {};
        for (const key in entry) {
          let value = entry[key];
          if (typeof value === 'string') value = value.trim();
          cleanedEntry[key] = value;
        }

        // store cleaned entry
        aircraftData[acReg][sourceType] = cleanedEntry;

        // build operator list
        if (cleanedEntry['Operator']) operatorSet.add(cleanedEntry['Operator']);
      }
    }

    allAcRegOptions = Object.keys(aircraftData).sort();
    allOperatorOptions = Array.from(operatorSet).sort();

    handleAcRegChange();
  } catch (error) {
    alert('Error loading aircraft data');
  }
});

// --- Operator Dropdown Logic ---
function showOperatorDropdown() {
  if (allOperatorOptions.length === 0) return;
  operatorDropdown.style.display = 'block';
  positionOperatorDropdown();
  filterOperatorDropdown();
}

function hideOperatorDropdown() {
  setTimeout(() => {
    operatorDropdown.style.display = 'none';
    operatorDropdownIndex = -1;
  }, 400);
}

function positionOperatorDropdown() {
  operatorDropdown.style.position = 'absolute';
  operatorDropdown.style.top =
    operatorInput.offsetTop + operatorInput.offsetHeight + 'px';
  operatorDropdown.style.left = operatorInput.offsetLeft + 'px';
  operatorDropdown.style.width = operatorInput.offsetWidth + 'px';
  operatorDropdown.style.maxHeight = '150px';
  operatorDropdown.style.overflowY = 'auto';
  operatorDropdown.style.border = '1px solid #ccc';
  operatorDropdown.style.backgroundColor = '#fff';
  operatorDropdown.style.zIndex = 1000;
}

function filterOperatorDropdown() {
  const filter = operatorInput.value.toUpperCase();
  operatorDropdown.innerHTML = '';

  const filtered = allOperatorOptions.filter((op) =>
    op.toUpperCase().includes(filter)
  );

  operatorDropdownItems = [];
  operatorDropdownIndex = -1;

  if (filtered.length === 0) {
    const div = document.createElement('div');
    div.textContent = 'No matches found';
    div.style.color = '#999';
    div.style.padding = '5px 10px';
    operatorDropdown.appendChild(div);
  } else {
    filtered.forEach((op, idx) => {
      const div = createOperatorDropdownItem(op, idx);
      operatorDropdown.appendChild(div);
      operatorDropdownItems.push(div);
    });
  }
}

function createOperatorDropdownItem(op, idx) {
  const div = document.createElement('div');
  div.textContent = op;
  div.style.padding = '5px 10px';
  div.style.cursor = 'pointer';
  div.onmouseenter = () => highlightOperatorItem(idx);
  div.onmouseleave = () => unhighlightOperatorItem(idx);
  div.onclick = () => selectOperator(op);
  return div;
}

function highlightOperatorItem(idx) {
  if (operatorDropdownItems[operatorDropdownIndex]) {
    operatorDropdownItems[operatorDropdownIndex].style.backgroundColor = '#fff';
  }
  operatorDropdownIndex = idx;
  operatorDropdownItems[idx].style.backgroundColor = '#d0e7fa';
}

function unhighlightOperatorItem(idx) {
  operatorDropdownItems[idx].style.backgroundColor = '#fff';
  operatorDropdownIndex = -1;
}

function selectOperator(op) {
  operatorInput.value = op;
  selectedOperator = op;
  operatorDropdown.style.display = 'none';

  acRegInput.value = '';
  filterAcRegDropdown();
  clearAircraftDetails();
}

// If Operator input is cleared manually
operatorInput.addEventListener('input', function () {
  if (!this.value.trim()) {
    selectedOperator = '';
    acRegInput.value = '';
    clearAircraftDetails();
    document.getElementById('natureOfReadout').value = '';
    document.getElementById('dataReceivedFrom').value = '';
    filterAcRegDropdown();
    hideSecondFormIfAllBlank();
  }
});

operatorInput.addEventListener('input', filterOperatorDropdown);
operatorInput.addEventListener('focus', showOperatorDropdown);
operatorInput.addEventListener('blur', hideOperatorDropdown);

operatorInput.addEventListener('keydown', function (e) {
  if (
    operatorDropdown.style.display !== 'block' ||
    operatorDropdownItems.length === 0
  )
    return;

  if (e.key === 'ArrowDown') {
    e.preventDefault();
    if (operatorDropdownIndex < operatorDropdownItems.length - 1) {
      highlightOperatorItem(operatorDropdownIndex + 1);
      operatorDropdownItems[operatorDropdownIndex].scrollIntoView({
        block: 'nearest',
      });
    }
  } else if (e.key === 'ArrowUp') {
    e.preventDefault();
    if (operatorDropdownIndex > 0) {
      highlightOperatorItem(operatorDropdownIndex - 1);
      operatorDropdownItems[operatorDropdownIndex].scrollIntoView({
        block: 'nearest',
      });
    }
  } else if (e.key === 'Enter') {
    e.preventDefault();
    if (operatorDropdownIndex > -1) {
      operatorDropdownItems[operatorDropdownIndex].click();
    } else if (operatorDropdownItems.length === 1) {
      operatorDropdownItems[0].click();
    }
  } else if (e.key === 'Escape') {
    operatorDropdown.style.display = 'none';
  }
});

// --- A/C Reg Dropdown Logic ---
function showAcRegDropdown() {
  if (allAcRegOptions.length === 0) return;
  acRegDropdown.style.display = 'block';
  positionAcRegDropdown();
  filterAcRegDropdown();
}

function hideAcRegDropdown() {
  setTimeout(() => {
    acRegDropdown.style.display = 'none';
    acRegDropdownIndex = -1;
  }, 400);
}

function positionAcRegDropdown() {
  acRegDropdown.style.position = 'absolute';
  acRegDropdown.style.top =
    acRegInput.offsetTop + acRegInput.offsetHeight + 'px';
  acRegDropdown.style.left = acRegInput.offsetLeft + 'px';
  acRegDropdown.style.width = acRegInput.offsetWidth + 'px';
  acRegDropdown.style.maxHeight = '150px';
  acRegDropdown.style.overflowY = 'auto';
  acRegDropdown.style.border = '1px solid #ccc';
  acRegDropdown.style.backgroundColor = '#fff';
  acRegDropdown.style.zIndex = 1000;
}

function filterAcRegDropdown() {
  const filter = acRegInput.value.toUpperCase();
  acRegDropdown.innerHTML = '';

  let filtered = allAcRegOptions;

  if (selectedOperator) {
    filtered = filtered.filter(reg => {
      const regData = aircraftData[reg];
      return Object.values(regData).some(
        src => src['Operator'] === selectedOperator
      );
    });
  }

  filtered = filtered.filter(reg => reg.toUpperCase().includes(filter)).sort();

  acRegDropdownItems = [];
  acRegDropdownIndex = -1;

  if (filtered.length === 0) {
    const div = document.createElement('div');
    div.textContent = 'No matches found';
    div.style.color = '#999';
    div.style.padding = '5px 10px';
    acRegDropdown.appendChild(div);
  } else {
    filtered.forEach((reg, idx) => {
      const div = createDropdownItem(reg, idx);
      acRegDropdown.appendChild(div);
      acRegDropdownItems.push(div);
    });

    // 🟢 Auto-select if only one match
    if (filtered.length === 1) {
      selectAcReg(filtered[0]);
    }
  }

  updateQarFdrLabels();
}

function createDropdownItem(reg, idx) {
  const div = document.createElement('div');
  div.textContent = reg;
  div.style.padding = '5px 10px';
  div.style.cursor = 'pointer';
  div.onmouseenter = () => highlightAcRegItem(idx);
  div.onmouseleave = () => unhighlightAcRegItem(idx);
  div.onclick = () => selectAcReg(reg);
  return div;
}

function highlightAcRegItem(idx) {
  if (acRegDropdownItems[acRegDropdownIndex]) {
    acRegDropdownItems[acRegDropdownIndex].style.backgroundColor = '#fff';
  }
  acRegDropdownIndex = idx;
  acRegDropdownItems[idx].style.backgroundColor = '#d0e7fa';
}

function unhighlightAcRegItem(idx) {
  acRegDropdownItems[idx].style.backgroundColor = '#fff';
  acRegDropdownIndex = -1;
}

function selectAcReg(reg) {
  acRegInput.value = reg;

  const regData = aircraftData[reg];
  if (!regData) return;

  // detect available source types
  const availableSources = Object.keys(regData);

  // auto-fill operator (from first source type for display only)
  const firstSource = regData[availableSources[0]];
  operatorInput.value = firstSource['Operator'] || '';
  selectedOperator = firstSource['Operator'] || '';

  // ❌ Do not auto-select source type
  // ❌ Do not open dropdown automatically
  // Instead, clear current source type input
  sourceTypeInput.value = '';
  sourceTypeDropdown.style.display = 'none';

  // Let the user open dropdown manually later
  acRegDropdown.style.display = 'none';
  handleAcRegChange();
}

function updateQarFdrLabels() {
  const typeValue = (sourceTypeInput.value || '').toUpperCase();
  const uploadLabel = document.getElementById('uploadLabel');
  const pnSnLabel = document.getElementById('pnSnLabel');

  if (!uploadLabel || !pnSnLabel) return;

  if (typeValue.includes('QAR')) {
    uploadLabel.textContent = 'Upload QAR Data:';
    pnSnLabel.textContent = 'QAR P/N–S/N:';
  } else {
    // ✅ Default & fallback → always FDR
    uploadLabel.textContent = 'Upload FDR Data:';
    pnSnLabel.textContent = 'FDR P/N–S/N:';
  }
}



acRegInput.addEventListener('input', filterAcRegDropdown);
acRegInput.addEventListener('focus', showAcRegDropdown);
acRegInput.addEventListener('blur', hideAcRegDropdown);
acRegInput.addEventListener('input', handleAcRegChange);


acRegInput.addEventListener('keydown', function (e) {
  if (
    acRegDropdown.style.display !== 'block' ||
    acRegDropdownItems.length === 0
  )
    return;

  if (e.key === 'ArrowDown') {
    e.preventDefault();
    if (acRegDropdownIndex < acRegDropdownItems.length - 1) {
      highlightAcRegItem(acRegDropdownIndex + 1);
      acRegDropdownItems[acRegDropdownIndex].scrollIntoView({
        block: 'nearest',
      });
    }
  } else if (e.key === 'ArrowUp') {
    e.preventDefault();
    if (acRegDropdownIndex > 0) {
      highlightAcRegItem(acRegDropdownIndex - 1);
      acRegDropdownItems[acRegDropdownIndex].scrollIntoView({
        block: 'nearest',
      });
    }
  } else if (e.key === 'Enter') {
    e.preventDefault();
    if (acRegDropdownIndex > -1) {
      acRegDropdownItems[acRegDropdownIndex].click();
    } else if (acRegDropdownItems.length === 1) {
      acRegDropdownItems[0].click();
    }
  } else if (e.key === 'Escape') {
    acRegDropdown.style.display = 'none';
  }
});

// --- Helper functions ---
function clearAircraftDetails() {
  document.getElementById('typeOfAC').value = '';
  document.getElementById('fdrPnSn').value = '';
  document.getElementById('lflRefNo').value = '';
  document.getElementById('noOfParametersRecorded').value = '';
  document.getElementById('noOfParametersSubmitted').value = '';
  sourceTypeInput.value = '';
  document.getElementById('uploadLabel').textContent = 'Upload FDR Data:';
}

function hideSecondFormIfAllBlank() {
  // You can add more fields if needed
  if (
    !operatorInput.value.trim() &&
    !acRegInput.value.trim() &&
    !document.getElementById('typeOfAC').value.trim() &&
    !document.getElementById('fdrPnSn').value.trim()
  ) {
    fileContainer.style.display = 'none';
    previewButton.style.display = 'none';
    // If you have a separate <form> for upload, hide it too:
    // document.getElementById('uploadForm').style.display = 'none';
  }
}

// --- Update visibility based on A/C Reg input ---
function handleAcRegChange() {
  const acRegValue = acRegInput.value.trim();
  const sourceTypeValue = sourceTypeInput.value.trim();

  updateQarFdrLabels();

  if (acRegValue && aircraftData[acRegValue] && (sourceTypeValue || Object.keys(aircraftData[acRegValue]).length === 1)) {
    document.getElementById('natureOfReadout').value = 'Periodical';
    document.getElementById('dataReceivedFrom').value = 'Operator';
    fileContainer.style.display = 'block';
  } else {
    fileContainer.style.display = 'none';
    previewButton.style.display = 'none';
  }
}


// --- Upload and Preview Logic (Unchanged) ---
fileInput.addEventListener('change', () => {
  fileList.innerHTML = '';
  const files = Array.from(fileInput.files);
  let allValid = true;
  const validFiles = [];

  files.forEach((file) => {
    if (file.name.toLowerCase().endsWith('.csv')) {
      validFiles.push(file);
    } else {
      allValid = false;
    }
  });

  // If any invalid file found, alert and filter input to only CSV files
  if (!allValid) {
    alert('Please upload only CSV files');
    // Re-assign only valid files to the file input
    const dataTransfer = new DataTransfer();
    validFiles.forEach((f) => dataTransfer.items.add(f));
    fileInput.files = dataTransfer.files;
  }

  // Show only valid files in the UI
  validFiles.forEach((file) => {
    const li = document.createElement('li');
    li.textContent = `📄 ${file.name} (${(file.size / 1024).toFixed(1)} KB)`;
    fileList.appendChild(li);
  });

  previewButton.style.display = validFiles.length > 0 ? 'block' : 'none';
});

function clearUploads() {
  if (confirm('Are you sure you want to delete all uploaded report files?')) {
    fetch('/clear-uploads', { method: 'POST' })
      .then((response) => {
        if (!response.ok) throw new Error('Failed to clear uploads');
        return response.text();
      })
      .then(() => {
        fileInput.value = '';
        fileList.innerHTML = '';
        previewButton.style.display = 'none';
        alert('Uploaded reports cleared successfully.');
      })
      .catch(() => {
        alert('Error clearing uploads.');
      });
  }
}

document.addEventListener('DOMContentLoaded', () => {
  const form = document.getElementById('htmlForm');
  if (!form) {
    console.error('[ERROR] Form element with id="htmlForm" not found!');
    return;
  }

  form.addEventListener('submit', async function (e) {
    e.preventDefault();
    console.log('[INFO] Form submit triggered ✅');

    const formData = new FormData(this);
    const button = previewButton;

    // #region Recorder Logic
    // 🟦 Add QAR/FDR recorder info based on acReg value
    const acRegValue = (document.getElementById('acReg').value || '').toUpperCase();
    const recorder = acRegValue.includes('QAR') ? 'QAR' : 'FDR';
    formData.append('recorder', recorder);
    // #endregion

    // #region FDR Part Number / Serial Number
    // Add separate Part Number and Serial Number to formData
    const fdrPnSn = document.getElementById('fdrPnSn')?.value;
    if (fdrPnSn) {
      const parts = fdrPnSn.split(';');
      formData.append('partNumber', parts[0] || '');
      formData.append('serialNumber', parts[1] || '');
    }
    // #endregion

    // #region Source Type Logic
    // Add the selected source type (e.g., QAR / FDR / DFDR etc.)
    const sourceTypeElement = document.getElementById('sourceType');
    if (sourceTypeElement) {
      const sourceTypeValue = sourceTypeElement.value || '';
      formData.append('sourceType', sourceTypeValue);
    } else {
      console.warn('[WARN] Source Type element not found');
    }
    // #endregion

    // #region Debug Logging
    console.group('[INFO] FormData contents');
    for (let [key, value] of formData.entries()) {
      console.log(`${key}:`, value);
    }
    console.groupEnd();
    // #endregion

    // #region Button Feedback
    button.disabled = true;
    button.style.backgroundColor = '#999';
    button.textContent = 'Generating...';
    // #endregion

    // #region Network Call
    try {
      const res = await fetch('/preview', {
        method: 'POST',
        body: formData,
      });

      if (!res.ok) {
        alert('Preview failed');
      } else {
        const htmlContent = await res.text();
        const blob = new Blob([htmlContent], { type: 'text/html' });
        const previewUrl = URL.createObjectURL(blob);
        window.open(previewUrl, '_blank');
        button.textContent = 'Generated ✔️';
      }
    } catch (err) {
      console.error('[ERROR] Network issue:', err);
      alert('Network error');
    } finally {
      button.disabled = false;
      button.style.backgroundColor = '#0073e6';
      button.textContent = 'Generate HTML Preview';
    }
    // #endregion
  });
});


