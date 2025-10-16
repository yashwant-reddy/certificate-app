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

fileContainer.style.display = 'none';
previewButton.style.display = 'none';

let operatorDropdownItems = [];
let operatorDropdownIndex = -1;
let acRegDropdownItems = [];
let acRegDropdownIndex = -1;

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

// Load aircraft data and prepare Operator/Reg options
window.addEventListener('DOMContentLoaded', async () => {
  try {
    const res = await fetch('/data/Operator Info.json');
    if (!res.ok) throw new Error('Failed to load aircraft data.');

    const jsonData = await res.json();
    aircraftData = {};

    for (const acReg in jsonData) {
      if (acReg) {
        const entry = jsonData[acReg];
        const cleanedEntry = {};
        for (const key in entry) {
          let value = entry[key];
          if (typeof value === 'string') {
            value = value.replace(/^,+|,+$/g, '').trim();
          }
          cleanedEntry[key] = value;
        }
        aircraftData[acReg.replace(/^,+|,+$/g, '').trim()] = cleanedEntry;
      }
    }

    allAcRegOptions = Object.keys(aircraftData);
    // Build unique operator list
    const operatorSet = new Set();
    for (const reg in aircraftData) {
      const op = aircraftData[reg]['Operator'];
      if (op) operatorSet.add(op);
    }
    allOperatorOptions = Array.from(operatorSet);

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
    filtered = filtered.filter(
      (reg) => aircraftData[reg]['Operator'] === selectedOperator
    );
  }
  filtered = filtered.filter((reg) => reg.toUpperCase().includes(filter));

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
  }

  // ✅ --- QAR/FDR Label Update (safe placement) ---
  // ✅ Ensure labels always sync on input change
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

  // Fill all other fields based on this reg
  const data = aircraftData[reg] || {};
  document.getElementById('typeOfAC').value = data['Aircraft type'] || '';
  document.getElementById('operator').value = data['Operator'] || '';
  document.getElementById('fdrPnSn').value =
    (data['Part Number'] || '') + ';' + (data['Serial Number'] || '');
  document.getElementById('lflRefNo').value = data['LFL Refrence NO'] || '';
  document.getElementById('noOfParametersRecorded').value =
    data['No of Parameter recorded'] || '';
  document.getElementById('noOfParametersSubmitted').value =
    data['No of Parameter submitted for Evaluation'] || '';

  // Sync the operator
  selectedOperator = data['Operator'] || '';
  operatorInput.value = data['Operator'] || '';

  // Set Nature of Readout to Periodical
  document.getElementById('natureOfReadout').value = 'Periodical';

  // Set Data Received From to Operator
  document.getElementById('dataReceivedFrom').value = 'Operator';

  acRegDropdown.style.display = 'none';
  handleAcRegChange();
}

function updateQarFdrLabels() {
  const acRegValue = (acRegInput.value || '').toUpperCase();
  const uploadLabel = document.getElementById('uploadLabel');
  const pnSnLabel = document.getElementById('pnSnLabel');

  if (!uploadLabel || !pnSnLabel) return;

  if (acRegValue.includes('QAR')) {
    uploadLabel.textContent = 'Upload QAR Data:';
    pnSnLabel.textContent = 'QAR P/N-S/N:';
  } else {
    uploadLabel.textContent = 'Upload FDR Data:';
    pnSnLabel.textContent = 'FDR P/N-S/N:';
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

  // ✅ Ensure labels always sync on input change
  updateQarFdrLabels();

  if (acRegValue && aircraftData[acRegValue]) {
    // Valid A/C Reg and validate nature of readout and data received from
    document.getElementById('natureOfReadout').value = 'Periodical';
    document.getElementById('dataReceivedFrom').value = 'Operator';
    fileContainer.style.display = 'block';
  } else {
    // Invalid or empty: clear all details!
    operatorInput.value = '';
    selectedOperator = '';
    clearAircraftDetails();
    document.getElementById('natureOfReadout').value = '';
    document.getElementById('dataReceivedFrom').value = '';
    fileContainer.style.display = 'none';
    previewButton.style.display = 'none';
    hideSecondFormIfAllBlank();
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

    // 🟦 Add QAR/FDR recorder info
    const acRegValue = (document.getElementById('acReg').value || '').toUpperCase();
    const recorder = acRegValue.includes('QAR') ? 'QAR' : 'FDR';
    formData.append('recorder', recorder);

    // Add separate Part Number and Serial Number to formData
    const fdrPnSn = document.getElementById('fdrPnSn').value;
    if (fdrPnSn) {
      const parts = fdrPnSn.split(';');
      formData.append('partNumber', parts[0] || '');
      formData.append('serialNumber', parts[1] || '');
    }

    // 🟨 Always log FormData contents
    console.group('[INFO] Loaded operator info data');
    for (let [key, value] of formData.entries()) {
      console.log(`${key}:`, value);
    }
    console.groupEnd();

    // 🟩 Button feedback
    button.disabled = true;
    button.style.backgroundColor = '#999';
    button.textContent = 'Generating...';

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
  });
});

